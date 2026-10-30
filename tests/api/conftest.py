import atexit
import json
import os
import shutil
import tempfile
import uuid
from types import SimpleNamespace

# Set before any backend import: backend.db and backend.rag read their paths at import time, and load_dotenv()
# never overrides a variable that is already set, so the real .env key can't be used here.
TMP_DIR = tempfile.mkdtemp(prefix="openresearch-tests-")
atexit.register(shutil.rmtree, TMP_DIR, ignore_errors=True)
os.environ["DB_PATH"] = os.path.join(TMP_DIR, "test.db")
os.environ["CHROMA_PATH"] = os.path.join(TMP_DIR, "chroma")  # importing the app opens it
os.environ["OPENAI_API_KEY"] = "sk-test-not-a-real-key"
os.environ["DEMO_ENABLED"] = "true"

import chromadb
import pytest
from fastapi.testclient import TestClient

import backend.agents.pdf_qa_agent as pdf_qa_agent
import backend.agents.project_relevance_agent as project_relevance_agent
import backend.agents.ranking_agent as ranking_agent
import backend.agents.source_discovery_agent as source_discovery_agent
import backend.rag.vector_store as vector_store
from backend.db import DB_PATH
from backend.main import app
from helpers import CSRF

@pytest.fixture
def client(monkeypatch, tmp_path):
    """A fresh database and PDF folder per test; entering the client runs startup (init + demo seed)."""
    for suffix in ("", "-wal", "-shm"):  # the DB runs in WAL mode
        if os.path.exists(DB_PATH + suffix):
            os.remove(DB_PATH + suffix)
    monkeypatch.chdir(tmp_path)  # docs/pdfs is relative to the working directory
    with TestClient(app, headers=CSRF) as test_client:
        yield test_client

class FakeOpenAI:
    """Stands in for every OpenAI client. Chat replies come from `reply(prompt)` (a dict or a raw
    string, so tests can send broken JSON); embeddings are small fixed vectors."""

    def __init__(self):
        self.reply = lambda prompt: {}
        self.prompts = []
        self.embedded = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._chat))
        self.embeddings = SimpleNamespace(create=self._embed)

    def _chat(self, messages, **_):
        prompt = messages[-1]["content"]
        self.prompts.append(prompt)
        content = self.reply(prompt)
        if not isinstance(content, str):
            content = json.dumps(content)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    def _embed(self, input, **_):
        texts = [input] if isinstance(input, str) else input
        self.embedded.extend(texts)
        return SimpleNamespace(data=[
            SimpleNamespace(index=i, embedding=[1.0, len(text) % 7 + 1.0, 2.0]) for i, text in enumerate(texts)
        ])

@pytest.fixture(autouse=True)
def fake_openai(monkeypatch):
    """Every test gets this: no test can call OpenAI or write to the real ./chroma_db."""
    fake = FakeOpenAI()
    for module in (pdf_qa_agent, project_relevance_agent, ranking_agent, source_discovery_agent):
        monkeypatch.setattr(module, "client", fake)
    monkeypatch.setattr(vector_store, "client_openai", fake)
    chroma = chromadb.EphemeralClient()
    collection = chroma.get_or_create_collection(name=f"test-{uuid.uuid4().hex}")
    monkeypatch.setattr(vector_store, "chunk_collection", collection)
    yield fake
    chroma.delete_collection(collection.name)  # the in-memory client is shared across the run
