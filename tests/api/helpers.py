"""Plain helpers for the API tests (fixtures live in conftest.py)."""
import re

import fitz

CSRF = {"X-Requested-With": "openresearch"}

def chunk_ids_in(prompt: str) -> list[int]:
    """The chunk ids the relevance prompt sent, so a fake reply can score real chunks."""
    return [int(i) for i in re.findall(r'"chunk_id": (\d+)', prompt)]

PARAGRAPH = (
    "Agents that remember past conversations need a memory system. This paper stores episodic "
    "events, semantic facts and procedures in separate stores, and a router decides which store "
    "answers each question. We evaluate the design on long multi-session benchmarks."
)

def make_pdf(pages: int = 2, text: str = PARAGRAPH) -> bytes:
    """A small real PDF with a text layer on every page (pass text="" for a 'scanned' one)."""
    doc = fitz.open()
    for page_no in range(pages):
        page = doc.new_page()
        if text:
            page.insert_textbox(fitz.Rect(72, 72, 540, 400), f"Section {page_no + 1}\n\n{text}", fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data

def register(client, email="someone@example.com", password="password123"):
    response = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()
