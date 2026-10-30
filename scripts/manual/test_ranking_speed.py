import time 

from backend.retrievers.manager import retrieve_all
from backend.agents.ranking_agent import rank_paper,rank_multiple_papers

query="multi agent memory systems"

papers,_,_=retrieve_all(query,1)

# Sequential Ranking 
start = time.time()
for paper in papers[2:5]:
    result=rank_paper(query,paper)
end = time.time()
print(f"{(end-start):.4f}")

# Concurrent Ranking
start = time.time()
result = rank_multiple_papers(query,papers[2:5])
end = time.time()
print(f"{(end-start):.4f}")
