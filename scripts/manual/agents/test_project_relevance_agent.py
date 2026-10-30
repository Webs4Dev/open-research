from backend.pdf.parser import extract_pdf_text
from backend.pdf.chunker import build_chunks
from backend.agents.project_relevance_agent import sort_relevant_chunks

text = extract_pdf_text("docs/Ai_Agent_Architectures_Survey.pdf")
chunks = build_chunks(text)
results = sort_relevant_chunks(
    chunks=chunks[:10],
    project_description="""
    Building an AI research
    retrieval and ranking
    platform
    """,
    top_k=3
)

for result in results:
    print()
    print(result.chunk_id)
    print(result.relevance_score)
    print(result.chunk_type)
    print(result.reason)