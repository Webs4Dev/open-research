import os
import tempfile

# Set before any backend import: backend.db reads DB_PATH at import time, and load_dotenv()
# never overrides a variable that is already set, so the real .env key can't be used here.
TMP_DIR = tempfile.mkdtemp(prefix="openresearch-tests-")
os.environ["DB_PATH"] = os.path.join(TMP_DIR, "test.db")
os.environ["OPENAI_API_KEY"] = "sk-test-not-a-real-key"
os.environ["DEMO_ENABLED"] = "true"

import pytest
from fastapi.testclient import TestClient

from backend.main import app

CSRF = {"X-Requested-With": "openresearch"}

@pytest.fixture
def client(monkeypatch, tmp_path):
    """A fresh database and PDF folder per test; entering the client runs startup (init + demo seed)."""
    for suffix in ("", "-wal", "-shm"):  # the DB runs in WAL mode
        if os.path.exists(os.environ["DB_PATH"] + suffix):
            os.remove(os.environ["DB_PATH"] + suffix)
    monkeypatch.chdir(tmp_path)  # docs/pdfs is relative to the working directory
    with TestClient(app, headers=CSRF) as test_client:
        yield test_client
