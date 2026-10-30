import time

from backend.retrievers.manager import retrieve_all

start=time.time()
papers,report,stats=retrieve_all(
    query="multi agent memory systems",
    max_results=5
)
end=time.time()

print(f"\nRetrieved {len(papers)} papers")
print(f"Time: {end-start:.2f} sec")

print(report)