from backend.retrievers.retriever_crossref import search_papers as crossref_search

papers = crossref_search(
    query="multi agent memory systems",
    max_results=5
    )

for paper in papers:
    print("="*50)
    print(paper.title)
    print(paper.authors)
    print(paper.published_year)