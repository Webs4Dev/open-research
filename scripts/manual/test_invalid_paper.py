from backend.schemas.paper import Paper
from backend.agents.ranking_agent import rank_paper

paper = Paper(
    title="Test Paper",
    abstract=None,
    authors=[],
    published_year=None,
    url=None,
    source="test"
)

result = rank_paper(
    query="multi agent systems",
    paper=paper
)

print(result)