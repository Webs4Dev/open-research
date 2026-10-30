import pytest

import backend.api.routes.search as search_routes
from backend.schemas.paper import Paper
from backend.schemas.stats import RetrievalStats
from helpers import register

def paper(title):
    # url=None keeps ranking offline: get_pdf_status only probes http(s) links.
    return Paper(title=title, abstract=f"About {title}.", authors=["A. Author"], published_year=2025, source="arxiv")

def ranking(topic_match):
    return {
        "scores": {"topic_match": topic_match, "project_relevance": 10, "research_similarity": 5,
                   "recency": 5, "potential_value": 5, "pdf_availability": 0},
        "why_it_matches": ["It studies the query topic."],
        "useful_ideas": ["Reuse its benchmark."],
        "pdf_usefulness": "No PDF found.",
    }

@pytest.fixture
def retrieved(monkeypatch):
    """Replace the live retrievers; set .papers to choose what a search 'finds'."""
    state = type("Retrieved", (), {"papers": [], "calls": []})()

    def fake_retrieve_all(query, max_results, sources):
        state.calls.append(sources)
        report = {s: {"count": len(state.papers), "status": "success", "retrieval_type": "api",
                      "duration": 0.1, "error": None} for s in sources}
        stats = RetrievalStats(total_papers=len(state.papers), unique_papers=len(state.papers),
                               duplicate_papers_removed=0, successful_sources=len(sources), failed_sources=0)
        return state.papers, report, stats

    monkeypatch.setattr(search_routes, "retrieve_all", fake_retrieve_all)
    return state

def test_search_ranks_best_first_and_saves_to_history(client, retrieved, fake_openai):
    register(client)
    retrieved.papers = [paper("Weak match"), paper("Strong match")]
    fake_openai.reply = lambda prompt: ranking(25 if "Strong match" in prompt else 5)

    response = client.post("/api/v1/search", json={"query": "agent memory", "sources": ["arxiv"]})
    assert response.status_code == 200
    body = response.json()
    assert [r["paper_name"] for r in body["ranked_results"]] == ["Strong match", "Weak match"]
    assert body["ranked_results"][0]["total_score"] == 50
    assert body["ranked_results"][0]["pdf_status"] == "unknown"

    history = client.get("/api/v1/history/searches").json()
    assert [(h["id"], h["query"], h["result_count"]) for h in history] == [(body["search_id"], "agent memory", 2)]
    assert client.get(f"/api/v1/history/searches/{body['search_id']}").json()["ranked_results"] == body["ranked_results"]

def test_search_uses_every_source_when_none_are_chosen(client, retrieved):
    register(client)
    client.post("/api/v1/search", json={"query": "agent memory"})
    assert retrieved.calls == [list(search_routes.ALL_SOURCES)]

def test_a_bad_llm_reply_drops_only_that_paper(client, retrieved, fake_openai):
    register(client)
    retrieved.papers = [paper("Good reply"), paper("Broken reply")]
    fake_openai.reply = lambda prompt: "{not json" if "Broken reply" in prompt else ranking(20)

    body = client.post("/api/v1/search", json={"query": "agent memory"}).json()
    assert body["total_papers_retrieved"] == 2
    assert [r["paper_name"] for r in body["ranked_results"]] == ["Good reply"]

def test_search_with_no_results_is_saved_without_llm_calls(client, retrieved, fake_openai):
    register(client)
    body = client.post("/api/v1/search", json={"query": "nothing matches"}).json()
    assert body["ranked_results"] == [] and body["search_id"] is not None
    assert fake_openai.prompts == []

@pytest.mark.parametrize("body, status", [
    ({"query": "   "}, 400),
    ({"query": "x", "sources": ["arxiv", "myspace"]}, 400),
    ({"query": "x", "max_results": 50}, 422),
])
def test_search_rejects_bad_requests(client, retrieved, body, status):
    register(client)
    assert client.post("/api/v1/search", json=body).status_code == status
    assert retrieved.calls == []

def test_retrieval_failure_is_a_clean_500(client, monkeypatch):
    register(client)
    def broken(**_):
        raise RuntimeError("network down")
    monkeypatch.setattr(search_routes, "retrieve_all", broken)
    response = client.post("/api/v1/search", json={"query": "agent memory"})
    assert response.status_code == 500
    assert response.json()["detail"] == "Retrieval failed"

def test_users_only_see_their_own_searches(client, retrieved):
    register(client)
    search_id = client.post("/api/v1/search", json={"query": "private"}).json()["search_id"]
    client.post("/api/v1/auth/logout")
    register(client, email="other@example.com")

    assert client.get("/api/v1/history/searches").json() == []
    assert client.get(f"/api/v1/history/searches/{search_id}").status_code == 404
    client.delete(f"/api/v1/history/searches/{search_id}")  # someone else's id: a no-op

    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/login", json={"email": "someone@example.com", "password": "password123"})
    assert client.get(f"/api/v1/history/searches/{search_id}").status_code == 200
