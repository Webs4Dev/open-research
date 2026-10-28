from fastapi import APIRouter,UploadFile,File,Form,HTTPException,Depends,Path
from fastapi.responses import FileResponse
import fitz
import os
import uuid

from backend.pdf.parser import extract_pdf_pages
from backend.pdf.chunker import build_chunks_from_pdf
from backend.rag.vector_store import *
from backend.agents.project_relevance_agent import sort_relevant_chunks
from backend.agents.pdf_qa_agent import answer_question
from backend.schemas.pdf import *
from backend.utils.hash import generate_content_id
from backend.utils.logger import log
from backend.auth import User, current_user
from backend.db import get_db

PDF_DIR = "docs/pdfs"
os.makedirs(PDF_DIR, exist_ok=True)

LLM_ERROR = "The AI returned an unexpected response. Please try again."

# Upload limits: every page costs embedding/LLM tokens, so cap size and length.
MAX_PDF_BYTES = 25 * 1024 * 1024
MAX_PDF_PAGES = 100
MAX_DESCRIPTION_CHARS = 2000
# Real papers have thousands of characters per page; scans have ~0 (maybe page numbers).
MIN_TEXT_CHARS_PER_PAGE = 50

router = APIRouter()

def read_pdf_upload(file: UploadFile) -> tuple[bytes, int]:
    """Read and validate an uploaded PDF; return its bytes and page count."""
    contents = file.file.read(MAX_PDF_BYTES + 1)
    if len(contents) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail=f"PDF is larger than {MAX_PDF_BYTES // (1024 * 1024)} MB")
    # The spec allows the header anywhere in the first 1024 bytes.
    if b"%PDF-" not in contents[:1024]:
        raise HTTPException(status_code=415, detail="File is not a PDF")

    try:
        with fitz.open(stream=contents, filetype="pdf") as doc:
            if doc.needs_pass:
                raise HTTPException(status_code=400, detail="PDF is password-protected")
            total_pages = len(doc)
    except RuntimeError:  # FileDataError and other MuPDF failures
        raise HTTPException(status_code=400, detail="PDF is damaged or unreadable")

    if total_pages == 0:
        raise HTTPException(status_code=400, detail="PDF has no pages")
    if total_pages > MAX_PDF_PAGES:
        raise HTTPException(status_code=413, detail=f"PDF has {total_pages} pages; the limit is {MAX_PDF_PAGES}")
    return contents, total_pages

def extract_text_pages(path: str) -> list[dict]:
    """Extract page text, rejecting PDFs with no text layer before any embedding/LLM spend."""
    pages = extract_pdf_pages(path)
    text_chars = sum(len(page["text"].strip()) for page in pages)
    if text_chars < MIN_TEXT_CHARS_PER_PAGE * len(pages):
        raise HTTPException(
            status_code=422,
            detail="This PDF has little or no selectable text (it may be scanned). OCR isn't supported yet.",
        )
    return pages

def save_pdf(path: str, contents: bytes):
    """Store the upload once. The name is a content hash, so an existing file already holds these bytes;
    rewriting it in place would truncate it under a concurrent GET /papers/{id}/file."""
    if os.path.exists(path):
        return
    tmp_path = f"{path}.{uuid.uuid4().hex}.tmp"  # unique per request: routes share a threadpool
    with open(tmp_path, "wb") as f:
        f.write(contents)
    os.replace(tmp_path, path)

def link_paper_to_user(user: User, paper_id: str, filename: str | None):
    with get_db() as db:
        db.execute(
            "INSERT OR IGNORE INTO user_papers (user_id, paper_id, filename) VALUES (?, ?, ?)",
            (user.id, paper_id, filename or "paper.pdf"),
        )

# Routes are plain `def` (not async) because they make blocking OpenAI/Chroma calls;
# FastAPI runs sync routes in a threadpool so one request can't freeze the server.
@router.post("/ingest",response_model=PDFIngestResponse)
def ingest_pdf(file:UploadFile=File(...), user:User=Depends(current_user)):
    contents, total_pages = read_pdf_upload(file)
    paper_id = generate_content_id(contents)
    temp_path = f"{PDF_DIR}/{paper_id}.pdf"

    if is_paper_ingested(paper_id):
        log(f"'{file.filename}' already ingested — skipping re-ingest")
        link_paper_to_user(user, paper_id, file.filename)
        save_pdf(temp_path, contents)
        return PDFIngestResponse(
            filename=file.filename,
            paper_id=paper_id,
            pages=total_pages,
            chunks_stored=count_chunks_for_paper(paper_id)
        )

    log(f"PDF uploaded: {file.filename}")
    save_pdf(temp_path, contents)

    pages = extract_text_pages(temp_path)
    total_pages = len(pages)
    log(f"Extracted {total_pages} pages from {file.filename}")

    chunks = build_chunks_from_pdf(temp_path)
    log(f"Created {len(chunks)} chunks")

    store_chunks(paper_id=paper_id, paper_title=file.filename, chunks=chunks)
    link_paper_to_user(user, paper_id, file.filename)

    return PDFIngestResponse(
        filename=file.filename,
        paper_id=paper_id,
        pages=total_pages,
        chunks_stored=len(chunks)
    )

@router.post("/analyze",response_model=PDFAnalysisResponse)
def analyze_pdf(file:UploadFile=File(...),project_description:str=Form(...,min_length=1)):
    # Browsers send textarea newlines as \r\n in multipart bodies; count them as one char
    # so text that fit the frontend's maxLength isn't rejected here.
    if len(project_description.replace("\r\n", "\n")) > MAX_DESCRIPTION_CHARS:
        raise HTTPException(status_code=422, detail=f"Project description is longer than {MAX_DESCRIPTION_CHARS} characters")
    contents, _ = read_pdf_upload(file)
    paper_id = generate_content_id(contents)
    temp_path=(f"{PDF_DIR}/{paper_id}.pdf")

    log(f"PDF uploaded: {file.filename}")
    save_pdf(temp_path, contents)

    pages=extract_text_pages(temp_path)
    total_pages=len(pages)
    log(f"Extracted {total_pages} pages from {file.filename}")

    chunks = build_chunks_from_pdf(temp_path)
    log(f"Created {len(chunks)} chunks")

    try:
        relevant_chunks = sort_relevant_chunks(
            chunks=chunks,
            project_description=project_description
        )
    except ValueError as e:  # bad JSON or schema mismatch from the LLM
        log(f"Relevance parse error: {e}")
        raise HTTPException(status_code=502, detail=LLM_ERROR)

    chunk_map = {chunk.chunk_id: chunk for chunk in chunks}

    for rc in relevant_chunks:
        original = chunk_map[rc.chunk_id]
        rc.chunk_text = original.text
        rc.page_no = original.page_no
        rc.boxes = original.boxes

    return PDFAnalysisResponse(
        filename=file.filename,
        paper_id=paper_id,
        pages=total_pages,
        chunk_count=len(chunks),
        relevant_chunks=relevant_chunks
    )
        
def require_owned_paper(user: User, paper_id: str):
    # Chroma and docs/pdfs hold every user's papers; only expose papers this user uploaded.
    with get_db() as db:
        owned = db.execute(
            "SELECT 1 FROM user_papers WHERE user_id = ? AND paper_id = ?", (user.id, paper_id)
        ).fetchone()
    if not owned:
        raise HTTPException(status_code=404, detail="Paper not found. Upload it to the workspace first.")

# The stored PDF, so a saved paper can be reopened in the viewer without re-uploading it.
@router.get("/papers/{paper_id}/file")
def get_paper_file(paper_id: str = Path(pattern=r"^[0-9a-f]{16}$"), user: User = Depends(current_user)):
    require_owned_paper(user, paper_id)
    path = f"{PDF_DIR}/{paper_id}.pdf"
    if not os.path.exists(path):  # the disk was wiped (e.g. a redeploy) but the history row survived
        raise HTTPException(status_code=404, detail="The PDF file is no longer stored. Upload it again.")
    return FileResponse(
        path,
        media_type="application/pdf",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=3600"},
    )

@router.post("/ask",response_model=PDFQAResponse)
def ask_question(request:PDFQARequest, user:User=Depends(current_user)):
    require_owned_paper(user, request.paper_id)

    retrieved_chunks = search_chunks(
        query=request.question,
        paper_id=request.paper_id,
        k=10
    )

    try:
        qa_result = answer_question(chunks=retrieved_chunks,question=request.question)
    except ValueError as e:  # bad JSON or schema mismatch from the LLM
        log(f"QA parse error: {e}")
        raise HTTPException(status_code=502, detail=LLM_ERROR)

    response = PDFQAResponse(
        answer=qa_result.answer,
        confidence=qa_result.confidence,
        found_in_chunks=qa_result.found_in_chunks,
        found_in_pages=qa_result.found_in_pages
    )
    with get_db() as db:
        db.execute(
            "INSERT INTO qa_messages (user_id, paper_id, question, response_json) VALUES (?, ?, ?, ?)",
            (user.id, request.paper_id, request.question, response.model_dump_json()),
        )
    return response