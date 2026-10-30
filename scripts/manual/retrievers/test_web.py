from backend.retrievers.retriever_web import web_retrieve


papers = web_retrieve(
    query="multi agent memory systems",
    source_type="edu",
    max_results=5
)

for paper in papers:
    print()
    print(paper.title)
    print(paper.url)
    print(paper.published_year)