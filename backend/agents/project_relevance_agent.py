from openai import OpenAI, OpenAIError
import json
import os
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

from prompts.project_relevance_prompt import PROJECT_RELEVANCE_PROMPT
from backend.schemas.relevance import RelevanceResponse
from backend.utils.format_chunks import format_chunks_pdf
from backend.utils.logger import log

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

# One prompt per batch keeps each request well inside the context window on large PDFs.
BATCH_SIZE = 20
MAX_WORKERS = 5

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
    result = RelevanceResponse(**parsed)

    # Keep only ids from this batch (once each): an invented id would break the caller's lookup.
    batch_ids = {chunk.chunk_id for chunk in chunks}
    evaluated, seen = [], set()
    for rc in result.evaluated_chunks:
        if rc.chunk_id in batch_ids and rc.chunk_id not in seen:
            seen.add(rc.chunk_id)
            evaluated.append(rc)
    return evaluated

def score_batch(batch,project_description):
    try:
        return find_relevant_chunks(batch,project_description)
    except (ValueError, OpenAIError) as e:  # bad JSON, schema mismatch, rate limit, timeout: skip this batch
        log(f"Relevance batch failed ({len(batch)} chunks): {e}")
        return None

def sort_relevant_chunks(chunks,project_description,top_k=20):
    batches = [chunks[i:i + BATCH_SIZE] for i in range(0, len(chunks), BATCH_SIZE)]
    with ThreadPoolExecutor(max_workers=min(len(batches), MAX_WORKERS) or 1) as executor:
        results = list(executor.map(lambda batch: score_batch(batch, project_description), batches))

    succeeded = [r for r in results if r is not None]
    if batches and not succeeded:
        raise ValueError("Every relevance batch failed")
    evaluated_chunks = [rc for r in succeeded for rc in r]
    log(f"Analyzed {len(chunks)} chunks in {len(batches)} batches ({len(batches) - len(succeeded)} failed)")

    evaluated_chunks.sort(
        key=lambda chunk:chunk.relevance_score,
        reverse=True
    )

    filtered = [chunk for chunk in evaluated_chunks if chunk.relevance_score >= 50]

    filtered = filtered[:top_k]
    log(f"Returning {len(filtered)} chunks")
    return filtered
