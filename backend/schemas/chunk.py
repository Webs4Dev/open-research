from pydantic import BaseModel

class HighlightBox(BaseModel):
    """One text line of a chunk, as fractions (0-1) of the page width/height,
    so the frontend can scale it to whatever size it renders the page at."""
    page_no:int
    x0:float
    y0:float
    x1:float
    y1:float

class PDFChunk(BaseModel):
    chunk_id:int
    page_no:int
    text:str
    length:int
    boxes:list[HighlightBox] = []
