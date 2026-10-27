import hashlib

def generate_paper_id(paper_code: str):
    return hashlib.sha256(paper_code.encode()).hexdigest()[:16]

def generate_content_id(data: bytes):
    """Same file bytes -> same id, whatever the file is named."""
    return hashlib.sha256(data).hexdigest()[:16]