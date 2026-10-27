from pydantic import BaseModel, Field
from typing import Optional

# Bounds match the rubric in prompts/ranking_prompt.py, so the sum is at most 100.
class Scores(BaseModel):
    topic_match: int = Field(ge=0, le=25)
    project_relevance: int = Field(ge=0, le=25)
    research_similarity: int = Field(ge=0, le=15)
    recency: int = Field(ge=0, le=10)
    potential_value: int = Field(ge=0, le=10)
    pdf_availability: int = Field(ge=0, le=15)

class LLMRanking(BaseModel):
    """What the LLM returns: judgment only. Paper facts come from `Paper`."""
    scores: Scores
    why_it_matches: list[str]
    useful_ideas: list[str]
    pdf_usefulness: str

class RankingResult(BaseModel):
    paper_name: str
    source: str
    published_year: Optional[int] = None
    pdf_status: str
    paper_url: Optional[str] = None
    scores: Scores
    total_score: int
    why_it_matches: list[str]
    useful_ideas: list[str]
    pdf_usefulness: str
