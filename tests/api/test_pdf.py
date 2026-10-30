import pytest

import backend.api.routes.pdf as pdf_routes
from backend.utils.hash import generate_content_id
from helpers import chunk_ids_in, make_pdf, register

PDF = make_pdf()
PAPER_ID = generate_content_id(PDF)

def upload(pdf=PDF, name="paper.pdf"):
    return {"file": (name, pdf, "application/pdf")}

def ingest(client, pdf=PDF):
    response = client.post("/api/v1/ingest", files=upload(pdf))
    assert response.status_code == 200
    return response.json()

def relevant(prompt):
    """Score every chunk in the prompt: the first one high, the rest below the 50 cut-off."""
    return {"evaluated_chunks": [
        {"chunk_id": cid, "relevance_score": 90 if n == 0 else 30, "chunk_type": "method",
         "reason": "Describes the memory router.", "suggested_use": "Cite it."}
        for n, cid in enumerate(chunk_ids_in(prompt))
    ]}

def test_ingest_stores_chunks_and_adds_the_paper(client, fake_openai):
    register(client)
    body = ingest(client)
    assert body["paper_id"] == PAPER_ID and body["pages"] == 2 and body["chunks_stored"] > 0
    assert len(fake_openai.embedded) == body["chunks_stored"]

    assert [p["paper_id"] for p in client.get("/api/v1/history/papers").json()] == [PAPER_ID]
    pdf = client.get(f"/api/v1/papers/{PAPER_ID}/file")
    assert pdf.status_code == 200 and pdf.content == PDF

def test_ingesting_a_stored_paper_again_skips_the_embeddings(client, fake_openai):
    register(client)
    first = ingest(client)
    client.post("/api/v1/auth/logout")
    register(client, email="other@example.com")
    fake_openai.embedded.clear()

    assert ingest(client)["chunks_stored"] == first["chunks_stored"]
    assert fake_openai.embedded == []
    assert [p["paper_id"] for p in client.get("/api/v1/history/papers").json()] == [PAPER_ID]

@pytest.mark.parametrize("pdf, status", [
    (b"just some text", 415),
    (b"%PDF-1.4 truncated nonsense", 400),
    (make_pdf(text=""), 422),  # no text layer, like a scan
])
def test_ingest_rejects_bad_pdfs_before_spending(client, fake_openai, pdf, status):
    register(client)
    assert client.post("/api/v1/ingest", files=upload(pdf)).status_code == status
    assert fake_openai.embedded == []
    assert client.get("/api/v1/history/papers").json() == []

def test_ingest_rejects_too_many_pages(client, monkeypatch):
    register(client)
    monkeypatch.setattr(pdf_routes, "MAX_PDF_PAGES", 1)
    assert client.post("/api/v1/ingest", files=upload()).status_code == 413

def test_analyze_returns_relevant_chunks_with_text_and_boxes(client, fake_openai):
    register(client)
    fake_openai.reply = relevant
    response = client.post("/api/v1/analyze", files=upload(), data={"project_description": "agent memory"})
    assert response.status_code == 200
    body = response.json()
    assert body["paper_id"] == PAPER_ID and body["chunk_count"] > 1
    assert len(body["relevant_chunks"]) == 1  # only the score-90 chunk passes the cut-off
    chunk = body["relevant_chunks"][0]
    assert "memory system" in chunk["chunk_text"] and chunk["page_no"] == 1 and chunk["boxes"]

    saved = client.get(f"/api/v1/history/papers/{PAPER_ID}/analysis").json()
    assert saved["description"] == "agent memory" and saved["result"] == body

def test_analyze_ignores_chunk_ids_the_llm_invented(client, fake_openai):
    register(client)
    fake_openai.reply = lambda prompt: {"evaluated_chunks": [
        {"chunk_id": 9999, "relevance_score": 99, "chunk_type": "x", "reason": "x", "suggested_use": "x"},
    ]}
    body = client.post("/api/v1/analyze", files=upload(), data={"project_description": "x"}).json()
    assert body["relevant_chunks"] == []

def test_analyze_returns_502_when_every_llm_reply_is_broken(client, fake_openai):
    register(client)
    fake_openai.reply = lambda prompt: "{not json"
    response = client.post("/api/v1/analyze", files=upload(), data={"project_description": "x"})
    assert response.status_code == 502
    assert response.json()["detail"] == pdf_routes.LLM_ERROR

def test_analyze_limits_the_description(client, fake_openai):
    register(client)
    too_long = "x" * (pdf_routes.MAX_DESCRIPTION_CHARS + 1)
    response = client.post("/api/v1/analyze", files=upload(), data={"project_description": too_long})
    assert response.status_code == 422
    assert fake_openai.prompts == []

def test_ask_answers_from_the_paper_and_saves_the_thread(client, fake_openai):
    register(client)
    ingest(client)
    answer = {"answer": "A router picks the store.", "confidence": 90, "found_in_chunks": [0], "found_in_pages": [1]}
    fake_openai.reply = lambda prompt: answer

    response = client.post("/api/v1/ask", json={"paper_id": PAPER_ID, "question": "How is memory routed?"})
    assert response.status_code == 200
    assert response.json() == answer
    assert "How is memory routed?" in fake_openai.prompts[-1]
    assert "memory system" in fake_openai.prompts[-1]  # the retrieved chunks were sent

    thread = client.get(f"/api/v1/history/papers/{PAPER_ID}/qa").json()
    assert [(m["question"], m["response"]) for m in thread] == [("How is memory routed?", answer)]

def test_ask_returns_502_on_a_broken_reply(client, fake_openai):
    register(client)
    ingest(client)
    fake_openai.reply = lambda prompt: {"answer": "missing fields"}
    response = client.post("/api/v1/ask", json={"paper_id": PAPER_ID, "question": "Why?"})
    assert response.status_code == 502
    assert client.get(f"/api/v1/history/papers/{PAPER_ID}/qa").json() == []

def test_other_users_cannot_reach_a_paper(client, fake_openai):
    register(client)
    ingest(client)
    client.post("/api/v1/auth/logout")
    register(client, email="other@example.com")

    assert client.get(f"/api/v1/papers/{PAPER_ID}/file").status_code == 404
    assert client.post("/api/v1/ask", json={"paper_id": PAPER_ID, "question": "Why?"}).status_code == 404
    assert fake_openai.prompts == []

def test_paper_file_ids_are_validated(client):
    register(client)
    assert client.get("/api/v1/papers/..%2F..%2Fetc%2Fpasswd/file").status_code in (404, 422)
    assert client.get("/api/v1/papers/NOT-A-HEX-ID/file").status_code == 422
