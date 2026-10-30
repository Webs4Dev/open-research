from backend.retrievers.manager import retrieve_all

papers,report,stats = retrieve_all(
    query="multi agent memory systems",
    max_results=2
)

print()
print(
    f"Papers: {len(papers)}"
)
print()

for paper in papers:

    print(
        paper.source,
        "|",
        paper.title
    )
print()
print(report)
print(stats)