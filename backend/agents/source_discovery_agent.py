from backend.schemas.source_discovery import SourceDiscoveryResult
from prompts.source_discovery_prompt import SOURCE_DISCOVERY_PROMPT

from openai import OpenAI
from dotenv import load_dotenv
import os
import json
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def discover_sources(query:str):
    prompt = (
        SOURCE_DISCOVERY_PROMPT.format(query=query)
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
    content = (response.choices[0].message.content)
    
    try:
        parsed=json.loads(content)
        return SourceDiscoveryResult(**parsed)

    except Exception:
        return SourceDiscoveryResult(
            recommended_sources=[
                "arxiv",
                "semantic_scholar",
                "openalex"
            ]
        )
    
