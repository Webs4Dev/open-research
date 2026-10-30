from backend.retrievers.manager import retrieve_all

_, report, stats = retrieve_all(
    query="multi agent memory systems",
    max_results=2
)

print()
print(stats)
print()
print(report)