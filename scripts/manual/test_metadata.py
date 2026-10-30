from backend.rag.collection import chunk_collection
from backend.utils.hash import generate_paper_id

chunk = chunk_collection.get(
    where={
        "paper_title":"T-RAG: Lessons from the LLM Trenches"
    },
    limit=1
) 

print("\n")
print(chunk['metadatas'])
