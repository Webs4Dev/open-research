from backend.retrievers.manager import retrieve_all
from backend.agents.ranking_agent import rank_paper,rank_multiple_papers

query="multi agent memory systems"

papers,_,_=retrieve_all(query,1)

# To save tokens
paper = papers[1]
result = rank_paper(query,paper)
print("="*50)
print(result.paper_name)
print(result.total_score)
print(result.why_it_matches)

# If we want to check all result for all papers
# results=rank_multiple_papers(query,papers)
# for result in results: 
#     print("="*50)
#     print(result.paper_name)
#     print(result.total_score)
#     print(result.why_it_matches)