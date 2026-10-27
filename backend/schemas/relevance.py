from pydantic import BaseModel
from backend.schemas.chunk import HighlightBox

class RelevantChunk(BaseModel):
    chunk_id:int
    chunk_text: str | None = None
    page_no:int|None = None
    relevance_score:int
    chunk_type:str
    reason:str
    suggested_use:str
    boxes:list[HighlightBox] = []

class RelevanceResponse(BaseModel):
    evaluated_chunks:list[RelevantChunk]