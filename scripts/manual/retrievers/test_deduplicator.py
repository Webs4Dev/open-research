from backend.retrievers.manager import retrieve_all

query="multi agent memory systems"

papers,_,_=retrieve_all(
    query=query,
    max_results=3
)

for paper in papers:
    print(paper.title)