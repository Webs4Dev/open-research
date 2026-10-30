from backend.pdf.parser import extract_pdf_text
from backend.pdf.chunker import build_chunks
from backend.agents.project_relevance_agent import sort_relevant_chunks
from backend.agents.pdf_qa_agent import answer_question

text = extract_pdf_text("docs/Ai_Agent_Architectures_Survey.pdf")
chunks = build_chunks(text)

relevant_chunks = (
    sort_relevant_chunks(
        chunks=chunks[:10],
        project_description=
        """
        AI agent systems
        """,
        top_k=5
    )
)

result = answer_question(

    question="How does AutoGen work?",
    chunks=
    [
        chunk for chunk in chunks if chunk.chunk_id in
        [
            r.chunk_id
            for r in relevant_chunks
        ]
    ]
)

print()
print(result.answer)
print()
print(result.confidence)
print(result.found_in_chunks)