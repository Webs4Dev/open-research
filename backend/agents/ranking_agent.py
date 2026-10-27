from openai import OpenAI
import json
import os
from dotenv import load_dotenv

from backend.schemas.ranking import RankingResult
from backend.utils.logger import log
from concurrent.futures import ThreadPoolExecutor,as_completed
from prompts.ranking_prompt import RANKING_PROMPT
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)


def rank_paper(query,paper,project_description=None):

  prompt = RANKING_PROMPT.format(
    query=query,
    project_description=project_description,
    paper=paper
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

    parsed = json.loads(response_content)
    result = RankingResult(**parsed)

    return result

  except Exception as e:
    log(f"JSON Parse Error: {e}")

    return None


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