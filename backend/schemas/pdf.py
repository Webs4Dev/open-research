from pydantic import BaseModel, Field
from backend.schemas.relevance import RelevantChunk

class PDFRequest(BaseModel):
    project_description:str
    question:str

class PDFIngestResponse(BaseModel):
    filename:str
    paper_id:str
    pages:int
    chunks_stored:int

class PDFAnalysisResponse(BaseModel):
    filename:str
    paper_id:str
    pages:int
    chunk_count:int
    relevant_chunks:list[RelevantChunk]

class PDFQARequest(BaseModel):
    paper_id: str = Field(pattern=r"^[0-9a-f]{16}$")
    question: str = Field(min_length=1, max_length=1000)

class PDFQAResponse(BaseModel):
    answer:str
    confidence:int
    found_in_chunks:list[int]
    found_in_pages:list[int]