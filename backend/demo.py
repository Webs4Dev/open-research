"""The shared read-only demo account, so visitors can see the app without signing up.

Its data is rebuilt from backend/demo_data/ on every startup: the database is wiped on
redeploys, and rebuilding also undoes anything that slipped past the read-only guard.
"""
import json
import os
import secrets

from backend.auth import hash_password
from backend.db import get_db
from backend.utils.files import PDF_DIR, save_pdf
from backend.utils.hash import generate_content_id

DEMO_ENABLED = os.getenv("DEMO_ENABLED", "true").strip().lower() in {"true", "1", "yes"}
# .invalid is a reserved TLD (RFC 2606), so no real person can own or register this address.
DEMO_EMAIL = "demo@openresearch.invalid"
# Shorter than real sessions, and capped: anyone can mint one without a password.
DEMO_SESSION_DAYS = 1
MAX_DEMO_SESSIONS = 500
DEMO_DIR = os.path.join(os.path.dirname(__file__), "demo_data")

def demo_user_id() -> int | None:
    with get_db() as db:
        row = db.execute("SELECT id FROM users WHERE email = ? AND is_demo = 1", (DEMO_EMAIL,)).fetchone()
    return row["id"] if row else None

def prune_demo_sessions(user_id: int):
    """Keep only the newest MAX_DEMO_SESSIONS demo sessions, so scripted demo logins can't grow the table."""
    with get_db() as db:
        db.execute(
            "DELETE FROM sessions WHERE user_id = ? AND token_hash NOT IN "
            "(SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY rowid DESC LIMIT ?)",
            (user_id, user_id, MAX_DEMO_SESSIONS),
        )

def seed_demo():
    with open(os.path.join(DEMO_DIR, "fixture.json"), encoding="utf-8") as f:
        fixture = json.load(f)
    paper = fixture["paper"]

    with open(os.path.join(DEMO_DIR, paper["pdf"]), "rb") as f:
        pdf_bytes = f.read()
    # paper_id is a content hash everywhere else, so a mismatch means the PDF was edited.
    if generate_content_id(pdf_bytes) != paper["paper_id"]:
        raise RuntimeError("backend/demo_data PDF doesn't match the fixture's paper_id")
    save_pdf(f"{PDF_DIR}/{paper['paper_id']}.pdf", pdf_bytes)

    with get_db() as db:
        # A random password nobody knows: the only way in is POST /auth/demo.
        db.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, is_demo) VALUES (?, ?, 1)",
            (DEMO_EMAIL, hash_password(secrets.token_urlsafe(32))),
        )
        row = db.execute("SELECT id FROM users WHERE email = ? AND is_demo = 1", (DEMO_EMAIL,)).fetchone()
        if row is None:  # a real account holds the address; never wipe its history
            raise RuntimeError(f"{DEMO_EMAIL} belongs to a non-demo account")
        user_id = row["id"]

        for table in ("searches", "user_papers", "qa_messages", "paper_analyses"):
            db.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))

        for search in fixture["searches"]:
            db.execute(
                "INSERT INTO searches (user_id, query, result_count, response_json) VALUES (?, ?, ?, ?)",
                (user_id, search["query"], search["result_count"], json.dumps(search["response"])),
            )
        db.execute(
            "INSERT INTO user_papers (user_id, paper_id, filename) VALUES (?, ?, ?)",
            (user_id, paper["paper_id"], paper["filename"]),
        )
        analysis = fixture["analysis"]
        db.execute(
            "INSERT INTO paper_analyses (user_id, paper_id, project_description, response_json) VALUES (?, ?, ?, ?)",
            (user_id, paper["paper_id"], analysis["project_description"], json.dumps(analysis["response"])),
        )
        for qa in fixture["qa"]:
            db.execute(
                "INSERT INTO qa_messages (user_id, paper_id, question, response_json) VALUES (?, ?, ?, ?)",
                (user_id, paper["paper_id"], qa["question"], json.dumps(qa["response"])),
            )
