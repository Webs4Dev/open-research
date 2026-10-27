from fastapi import APIRouter,UploadFile,File,Form,HTTPException
import fitz
import os

from backend.pdf.parser import extract_pdf_pages
from backend.pdf.chunker import build_chunks_from_pages
from backend.rag.vector_store import *
from backend.agents.project_relevance_agent import sort_relevant_chunks
from backend.agents.pdf_qa_agent import answer_question
from backend.schemas.pdf import *
from backend.utils.hash import generate_paper_id
from backend.utils.logger import log

PDF_DIR = "docs/pdfs"
os.makedirs(PDF_DIR, exist_ok=True)

LLM_ERROR = "The AI returned an unexpected response. Please try again."

router = APIRouter()

# Routes are plain `def` (not async) because they make blocking OpenAI/Chroma calls;
# FastAPI runs sync routes in a threadpool so one request can't freeze the server.
@router.post("/ingest",response_model=PDFIngestResponse)
def ingest_pdf(file:UploadFile=File(...)):
    paper_id = generate_paper_id(file.filename)
    temp_path = f"{PDF_DIR}/{paper_id}.pdf"
    contents = file.file.read()

    if is_paper_ingested(file.filename):
        log(f"'{file.filename}' already ingested — skipping re-ingest")
        with open(temp_path, "wb") as f:
            f.write(contents)
        with fitz.open(temp_path) as doc:
            total_pages = len(doc)
        return PDFIngestResponse(
            filename=file.filename,
            paper_id=paper_id,
            pages=total_pages,
            chunks_stored=count_chunks_for_paper(file.filename)
        )

    log(f"PDF uploaded: {file.filename}")
    with open(temp_path, 'wb') as f:
        f.write(contents)

    pages = extract_pdf_pages(temp_path)
    total_pages = len(pages)
    log(f"Extracted {total_pages} pages from {file.filename}")

    chunks = build_chunks_from_pages(pages)
    log(f"Created {len(chunks)} chunks")

    store_chunks(paper_title=file.filename, chunks=chunks)

    return PDFIngestResponse(
        filename=file.filename,
        paper_id=paper_id,
        pages=total_pages,
        chunks_stored=len(chunks)
    )

@router.post("/analyze",response_model=PDFAnalysisResponse)
def analyze_pdf(file:UploadFile=File(...),project_description:str=Form(...)):
    paper_id = generate_paper_id(file.filename)
    temp_path=(f"{PDF_DIR}/{paper_id}.pdf")
    contents=(file.file.read())

    log(f"PDF uploaded: {file.filename}")
    with open(temp_path,"wb") as f:
        f.write(contents)

    pages=extract_pdf_pages(temp_path)
    total_pages=len(pages)
    log(f"Extracted {total_pages} pages from {file.filename}")

    chunks = build_chunks_from_pages(pages)
    log(f"Created {len(chunks)} chunks")

    try:
        relevant_chunks = sort_relevant_chunks(
            chunks=chunks,
            project_description=project_description,
            top_k=max(5,total_pages)
        )
    except ValueError as e:  # bad JSON or schema mismatch from the LLM
        log(f"Relevance parse error: {e}")
        raise HTTPException(status_code=502, detail=LLM_ERROR)

    chunk_map = {chunk.chunk_id: chunk for chunk in chunks}

    for rc in relevant_chunks:
        original = chunk_map[rc.chunk_id]
        rc.chunk_text = original.text
        rc.page_no = original.page_no

    return PDFAnalysisResponse(
        filename=file.filename,
        paper_id=paper_id,
        pages=total_pages,
        chunk_count=len(chunks),
        relevant_chunks=relevant_chunks
    )
        
@router.post("/ask",response_model=PDFQAResponse)
def ask_question(request:PDFQARequest):
    retrieved_chunks = search_chunks(
        query=request.question,
        paper_title=request.paper_title,
        k=10
    )

    try:
        qa_result = answer_question(chunks=retrieved_chunks,question=request.question)
    except ValueError as e:  # bad JSON or schema mismatch from the LLM
        log(f"QA parse error: {e}")
        raise HTTPException(status_code=502, detail=LLM_ERROR)

    return PDFQAResponse(
        answer=qa_result.answer,
        confidence=qa_result.confidence,
        found_in_chunks=qa_result.found_in_chunks,
        found_in_pages=qa_result.found_in_pages
    )