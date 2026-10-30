from backend.pdf.parser import extract_pdf_text
from backend.pdf.chunker import build_chunks

text = extract_pdf_text('./docs/Old Resume.pdf')
chunks = build_chunks(text)

for chunk in chunks[-3:]:
    print()
    print(chunk.chunk_id)
    print(chunk.length)
    print(chunk.text[:150])