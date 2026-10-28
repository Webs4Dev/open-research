from fastapi import APIRouter, Depends, HTTPException

from backend.auth import User, current_user
from backend.db import get_db

from backend.retrievers.manager import retrieve_all, ALL_SOURCES
from backend.agents.ranking_agent import rank_multiple_papers
from backend.utils.logger import log
from backend.schemas.report import *

router = APIRouter()

@router.get("/sources")
def list_sources():
    """Return all available retrieval sources."""
    return {
        "available_sources": list(ALL_SOURCES.keys()),
        "total": len(ALL_SOURCES)
    }


@router.post("/search", response_model=SearchResponse)
def search_and_rank(request: SearchRequest, user: User = Depends(current_user)):

    if not request.query.strip():
        raise HTTPException(status_code=400,detail="Query cannot be empty")

    if request.sources:
        invalid = [source for source in request.sources if source not in ALL_SOURCES]
        if invalid:
            raise HTTPException(status_code=400,detail=f"Invalid sources: {invalid}")

    active_sources = (request.sources or list(ALL_SOURCES.keys()))

    try:
        papers, report, stats = retrieve_all(
            query=request.query,
            max_results=request.max_results,
            sources=active_sources
        )

    except Exception as e:
        log(f"Retrieval Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Retrieval failed"
        )

    if not papers:
        return save_search(user, SearchResponse(
            query=request.query,
            sources_requested=active_sources,
            total_papers_retrieved=0,
            total_ranked=0,
            source_report={k: SourceReport(**v) for k, v in report.items()},
            retrieval_stats=stats,
            ranked_results=[]
        ))

    ranked = rank_multiple_papers(request.query,papers,request.project_description)
    ranked = [r.model_dump() for r in ranked]

    ranked.sort(key=lambda r: r["total_score"], reverse=True)

    return save_search(user, SearchResponse(
        query=request.query,
        sources_requested=active_sources,
        total_papers_retrieved=len(papers),
        total_ranked=len(ranked),
        source_report={k: SourceReport(**v) for k, v in report.items()},
        retrieval_stats=stats,
        ranked_results=ranked
    ))

def save_search(user: User, response: SearchResponse) -> SearchResponse:
    """Store the full response so the user can reopen it later without re-running (and re-paying for) it."""
    with get_db() as db:
        response.search_id = db.execute(
            "INSERT INTO searches (user_id, query, result_count, response_json) VALUES (?, ?, ?, ?)",
            (user.id, response.query, response.total_ranked, response.model_dump_json()),
        ).lastrowid
    return response
