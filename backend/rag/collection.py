import os

import chromadb

client_db = chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma_db"))

chunk_collection = client_db.get_or_create_collection(
    name="pdf_chunks"
)
