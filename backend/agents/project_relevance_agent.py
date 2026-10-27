from openai import OpenAI
import json
import os
from dotenv import load_dotenv

from prompts.project_relevance_prompt import PROJECT_RELEVANCE_PROMPT
from backend.schemas.relevance import RelevanceResponse
from backend.utils.format_chunks import format_chunks_pdf
from backend.utils.logger import log

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def find_relevant_chunks(chunks,project_description):

    prompt = (
        PROJECT_RELEVANCE_PROMPT.format(
            project_description=project_description,
            chunks=json.dumps(format_chunks_pdf(chunks),indent=2)
        )
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
    

    parsed = json.loads(response.choices[0].message.content)
    return RelevanceResponse(**parsed)

def sort_relevant_chunks(chunks,project_description,top_k=5):
    result = find_relevant_chunks(chunks,project_description)
    log(f"Analyzed {len(chunks)} chunks")

    result.evaluated_chunks.sort(
        key=lambda chunk:chunk.relevance_score,
        reverse=True
    )

    filtered = [chunk for chunk in result.evaluated_chunks if chunk.relevance_score >= 50]

    filtered = filtered[:top_k]
    log(f"Returning {len(filtered)} chunks")
    return filtered
