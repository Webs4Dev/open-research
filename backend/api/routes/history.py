import json

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel

from backend.auth import User, current_user
from backend.db import get_db
from backend.schemas.pdf import PDFQAResponse
from backend.schemas.report import SearchResponse

router = APIRouter()

class SearchSummary(BaseModel):
    id: int
    query: str
    result_count: int
    created_at: str

class PaperSummary(BaseModel):
    paper_id: str
    filename: str
    created_at: str

class QAMessage(BaseModel):
    id: int
    question: str
    response: PDFQAResponse
    created_at: str

@router.get("/history/searches", response_model=list[SearchSummary])
def list_searches(user: User = Depends(current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT id, query, result_count, created_at FROM searches "
            "WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100",
            (user.id,),
        ).fetchall()
    return [SearchSummary(**row) for row in rows]

@router.get("/history/searches/{search_id}", response_model=SearchResponse)
def get_search(search_id: int, user: User = Depends(current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT response_json FROM searches WHERE id = ? AND user_id = ?", (search_id, user.id)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Search not found")
    return SearchResponse.model_validate_json(row["response_json"])

@router.delete("/history/searches/{search_id}", status_code=204)
def delete_search(search_id: int, user: User = Depends(current_user)):
    with get_db() as db:
        db.execute("DELETE FROM searches WHERE id = ? AND user_id = ?", (search_id, user.id))

@router.get("/history/papers", response_model=list[PaperSummary])
def list_papers(user: User = Depends(current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT paper_id, filename, created_at FROM user_papers "
            "WHERE user_id = ? ORDER BY created_at DESC",
            (user.id,),
        ).fetchall()
    return [PaperSummary(**row) for row in rows]

@router.get("/history/papers/{paper_id}/qa", response_model=list[QAMessage])
def list_qa(paper_id: str = Path(pattern=r"^[0-9a-f]{16}$"), user: User = Depends(current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT id, question, response_json, created_at FROM qa_messages "
            "WHERE user_id = ? AND paper_id = ? ORDER BY created_at, id",
            (user.id, paper_id),
        ).fetchall()
    return [
        QAMessage(
            id=row["id"],
            question=row["question"],
            response=PDFQAResponse(**json.loads(row["response_json"])),
            created_at=row["created_at"],
        )
        for row in rows
    ]
