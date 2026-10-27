from pydantic import BaseModel, Field
from typing import Optional
from backend.schemas.stats import RetrievalStats

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    project_description: Optional[str] = Field(default=None, max_length=2000)
    # Every retrieved paper costs one LLM ranking call, so keep this small.
    max_results: int = Field(default=5, ge=1, le=10)
    sources: Optional[list[str]] = Field(default=None, max_length=10)

class SourceReport(BaseModel):
    count: int
    status: str
    retrieval_type: str
    duration: float
    error: Optional[str]
    
class SearchResponse(BaseModel):
    query: str
    sources_requested: list[str]
    total_papers_retrieved: int
    total_ranked: int
    source_report: dict[str, SourceReport]
    retrieval_stats: RetrievalStats
    ranked_results: list
