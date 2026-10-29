import os
import sqlite3
from contextlib import contextmanager

from dotenv import load_dotenv

load_dotenv()

# One local SQLite file. On hosts with ephemeral disks (Render free tier) it is
# wiped on every deploy; that's an accepted trade-off for this project.
DB_PATH = os.getenv("DB_PATH", "data/openresearch.db")

# Timestamps are UTC ISO strings, so they sort and compare correctly as text.
NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')"

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    -- 1 for the shared read-only demo account (backend/demo.py)
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ({NOW})
);

-- Only a hash of the session token is stored, so a leaked DB file can't be used to log in.
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
);
-- Every login prunes expired rows, and POST /auth/demo is public, so keep that DELETE cheap.
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_count INTEGER NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ({NOW})
);
CREATE INDEX IF NOT EXISTS idx_searches_user ON searches(user_id, created_at);

-- Chroma stores each paper once (keyed by content hash); this records who uploaded it,
-- so users can only ask questions about their own papers.
CREATE TABLE IF NOT EXISTS user_papers (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ({NOW}),
    PRIMARY KEY (user_id, paper_id)
);

CREATE TABLE IF NOT EXISTS qa_messages (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id TEXT NOT NULL,
    question TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ({NOW})
);
CREATE INDEX IF NOT EXISTS idx_qa_user_paper ON qa_messages(user_id, paper_id, created_at);

-- Only the latest relevance analysis per paper; scoring again replaces it.
CREATE TABLE IF NOT EXISTS paper_analyses (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id TEXT NOT NULL,
    project_description TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ({NOW}),
    PRIMARY KEY (user_id, paper_id)
);
"""

def init_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    with get_db() as db:
        db.execute("PRAGMA journal_mode=WAL")  # readers don't block the writer
        db.executescript(SCHEMA)
        # CREATE TABLE IF NOT EXISTS doesn't add columns to a DB made before they existed.
        user_columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        if "is_demo" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0")

@contextmanager
def get_db():
    """A short-lived connection per use (routes run in a threadpool); commits on success."""
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
        db.commit()
    finally:
        db.close()
