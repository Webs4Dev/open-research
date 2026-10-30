from backend.pdf.chunker import build_chunks_from_pdf

chunks = build_chunks_from_pdf("docs/Ai_Agent_Architectures_Survey.pdf")

for chunk in chunks[0:11]:
    print()
    print(chunk.chunk_id)
    print(chunk.page_no)
    print(chunk.length)