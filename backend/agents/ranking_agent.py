from openai import OpenAI
import json
import os
from dotenv import load_dotenv

from backend.schemas.ranking import LLMRanking, RankingResult
from backend.utils.pdf import has_pdf
from backend.utils.logger import log
from concurrent.futures import ThreadPoolExecutor,as_completed
from prompts.ranking_prompt import RANKING_PROMPT
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)


def get_pdf_status(url):
  if not url or not url.lower().startswith(("http://", "https://")):  # retrievers use "Not Available"
    return "unknown"
  return "available" if has_pdf(url) else "unavailable"


def rank_paper(query,paper,project_description=None):

  pdf_status = get_pdf_status(paper.url)
  prompt = RANKING_PROMPT.format(
    query=query,
    project_description=project_description,
    paper=paper,
    abstract=paper.abstract or "not provided",
    year=paper.published_year or "not provided",
    pdf_status=pdf_status
  )

  response = client.chat.completions.create(
    model="gpt-4o-mini",
    response_format={"type":"json_object"},
    messages=[
      {
        "role":"user",
        "content":prompt
      }
    ]
  )

  response_content = response.choices[0].message.content
  try:

    ranking = LLMRanking(**json.loads(response_content))
  except Exception as e:
    log(f"JSON Parse Error: {e}")

    return None

  # Facts come from the retrieved Paper, never from the LLM's echo of them.
  return RankingResult(
    paper_name=paper.title,
    source=paper.source,
    published_year=paper.published_year,
    pdf_status=pdf_status,
    paper_url=paper.url,
    scores=ranking.scores,
    total_score=sum(ranking.scores.model_dump().values()),
    why_it_matches=ranking.why_it_matches,
    useful_ideas=ranking.useful_ideas,
    pdf_usefulness=ranking.pdf_usefulness
  )


def rank_multiple_papers(query,papers,project_description=None):
    
  results=[]
  if not papers:
    log("No papers to rank")
    return []
  with ThreadPoolExecutor(max_workers=min(len(papers),5)) as executor:
    futures=[
        executor.submit(rank_paper,query,paper,project_description)
        for paper in papers
        ]
        
    for future in as_completed(futures): 
      try:
        result=future.result()
        if result:
          results.append(result)

      except Exception as e:
        log(f"[Ranking Agent] {e}")
                
  return results