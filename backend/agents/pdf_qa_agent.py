from openai import OpenAI
import json
import os
from dotenv import load_dotenv

from prompts.pdf_qa_prompt import PDF_QA_PROMPT
from backend.schemas.pdf import PDFQAResponse
from backend.utils.format_chunks import format_chunks_context
from backend.utils.logger import log

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def answer_question(question,chunks):
    prompt = (
        PDF_QA_PROMPT.format(
            question=question,
            chunks=format_chunks_context(chunks)
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
    
    log(f"Question: {question}")
    parsed = json.loads(response.choices[0].message.content)
    return PDFQAResponse(**parsed)