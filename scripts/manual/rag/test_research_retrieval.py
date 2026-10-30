from backend.rag.vector_store import retrieve_context

results = retrieve_context(
    "multi agent memory systems",
    k=5
)

for result in results:
    print()
    print(result["paper_title"])
    print(result["source"])