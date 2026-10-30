import os
import sqlite3

import pytest

import backend.api.routes.auth as auth_routes
from backend.auth import DEMO_READ_ONLY
from backend.db import DB_PATH, init_db
from backend.demo import DEMO_EMAIL, seed_demo

PAPER_ID = "8204e2a238a86af1"

def demo_login(client):
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200
    return response.json()

def test_demo_login_is_a_demo_session(client):
    user = demo_login(client)
    assert user["is_demo"] is True
    assert client.get("/api/v1/auth/me").json() == user

def test_demo_can_read_everything_seeded(client):
    demo_login(client)
    searches = client.get("/api/v1/history/searches").json()
    assert len(searches) == 1
    assert client.get(f"/api/v1/history/searches/{searches[0]['id']}").json()["ranked_results"]

    assert [p["paper_id"] for p in client.get("/api/v1/history/papers").json()] == [PAPER_ID]
    assert client.get(f"/api/v1/history/papers/{PAPER_ID}/analysis").json()["result"]["relevant_chunks"]
    assert len(client.get(f"/api/v1/history/papers/{PAPER_ID}/qa").json()) == 1

    pdf = client.get(f"/api/v1/papers/{PAPER_ID}/file")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF-")

PDF_FILE = {"file": ("paper.pdf", b"%PDF-1.4 not really a pdf", "application/pdf")}

@pytest.mark.parametrize(
    "method, path, kwargs",
    [
        ("post", "/api/v1/search", {"json": {"query": "memory for agents"}}),
        ("post", "/api/v1/ingest", {"files": PDF_FILE}),
        ("post", "/api/v1/analyze", {"files": PDF_FILE, "data": {"project_description": "x"}}),
        ("post", "/api/v1/ask", {"json": {"paper_id": PAPER_ID, "question": "What is it about?"}}),
        ("delete", "/api/v1/history/searches/1", {}),
    ],
)
def test_demo_cannot_spend_credits_or_change_shared_data(client, method, path, kwargs):
    demo_login(client)
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 403
    assert response.json()["detail"] == DEMO_READ_ONLY

def test_regular_users_are_not_read_only(client):
    client.post("/api/v1/auth/register", json={"email": "someone@example.com", "password": "password123"})
    assert client.get("/api/v1/auth/me").json()["is_demo"] is False
    # Not a paid route, so it really runs: 204 for a missing id means the guard let it through.
    assert client.delete("/api/v1/history/searches/999").status_code == 204

def test_demo_account_cannot_be_used_with_a_password(client):
    response = client.post("/api/v1/auth/login", json={"email": DEMO_EMAIL, "password": "password123"})
    assert response.status_code == 401
    response = client.post("/api/v1/auth/register", json={"email": DEMO_EMAIL, "password": "password123"})
    assert response.status_code == 409

def test_demo_can_be_turned_off(client, monkeypatch):
    monkeypatch.setattr(auth_routes, "DEMO_ENABLED", False)
    assert client.post("/api/v1/auth/demo").status_code == 404

def test_seeding_again_restores_the_demo_instead_of_duplicating_it(client):
    seed_demo()
    seed_demo()
    demo_login(client)
    assert len(client.get("/api/v1/history/searches").json()) == 1
    assert len(client.get(f"/api/v1/history/papers/{PAPER_ID}/qa").json()) == 1

def test_init_db_adds_is_demo_to_an_older_database(client):
    with sqlite3.connect(DB_PATH) as db:
        db.executescript("DROP TABLE users; CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, password_hash TEXT);")
    init_db()
    with sqlite3.connect(DB_PATH) as db:
        assert "is_demo" in {row[1] for row in db.execute("PRAGMA table_info(users)")}

def count_demo_sessions():
    with sqlite3.connect(DB_PATH) as db:
        return db.execute(
            "SELECT COUNT(*) FROM sessions JOIN users ON users.id = sessions.user_id WHERE users.is_demo = 1"
        ).fetchone()[0]

def test_trying_the_demo_again_reuses_the_session(client):
    demo_login(client)
    demo_login(client)
    assert count_demo_sessions() == 1

def test_demo_sessions_are_capped(client, monkeypatch):
    import backend.demo as demo
    monkeypatch.setattr(demo, "MAX_DEMO_SESSIONS", 3)
    for _ in range(5):
        client.cookies.clear()  # a new visitor each time
        demo_login(client)
    assert count_demo_sessions() == 3

def test_demo_email_cannot_be_registered_even_when_the_demo_is_off(client):
    with sqlite3.connect(DB_PATH) as db:
        db.execute("DELETE FROM users WHERE email = ?", (DEMO_EMAIL,))
    response = client.post("/api/v1/auth/register", json={"email": DEMO_EMAIL, "password": "password123"})
    assert response.status_code == 409

def test_broken_demo_data_disables_the_demo_instead_of_the_app(monkeypatch, tmp_path):
    import backend.main as main
    from fastapi.testclient import TestClient
    from helpers import CSRF

    def broken_seed():
        raise RuntimeError("fixture missing")

    monkeypatch.setattr(main, "seed_demo", broken_seed)
    monkeypatch.chdir(tmp_path)
    for suffix in ("", "-wal", "-shm"):  # start from no database, like a fresh deploy
        if os.path.exists(DB_PATH + suffix):
            os.remove(DB_PATH + suffix)
    with TestClient(main.app, headers=CSRF) as fresh:
        assert fresh.get("/health").status_code == 200
        assert fresh.post("/api/v1/auth/demo").status_code == 404

def test_every_feature_route_has_the_read_only_guard():
    """A new router or route mounted without block_demo_writes would let the demo spend credits."""
    from fastapi.routing import APIRoute
    from backend.auth import block_demo_writes
    from backend.main import app

    for route in app.routes:
        if not isinstance(route, APIRoute) or route.path.startswith("/api/v1/auth/") or route.path == "/health":
            continue
        guards = [dep.call for dep in route.dependant.dependencies]
        assert block_demo_writes in guards, f"{route.path} is missing block_demo_writes"
