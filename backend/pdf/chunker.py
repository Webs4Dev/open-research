import re
from itertools import groupby

import fitz

from backend.schemas.chunk import HighlightBox, PDFChunk

## Chunker V1 - Text
def chunk_text(text:str,chunk_size:int=1000):
    chunks=[]

    for i in range(0,len(text),chunk_size):
        chunk=text[i:i+chunk_size]
        chunks.append(chunk)

    return chunks

def build_chunks(text:str,chunk_size:int=1000):
    
    raw_chunks = chunk_text(text,chunk_size)
    chunks = []

    for idx,chunk in enumerate(raw_chunks):
        chunks.append(PDFChunk(
            chunk_id=idx,
            text=chunk,
            length=len(chunk)
        ))
    
    return chunks

## Chunker V3 - Paragraph-aware, with line boxes
# Chunks follow the PDF's own text blocks (paragraphs) and never overlap or span pages.
# Small blocks (headings, captions) merge with their neighbours; blocks longer than
# MAX_CHUNK_CHARS split at sentence ends. Each chunk keeps the box of every line it
# covers, so the frontend can draw exact highlights instead of searching for the text.
TARGET_CHUNK_CHARS = 1000
MAX_CHUNK_CHARS = 1500
MAX_HEADING_CHARS = 80
MIN_CHUNK_CHARS = 100
MIN_BLOCK_LETTERS = 3
SENTENCE_END = re.compile(r"[.!?][\"')\]]*$")

def words_to_text(words):
    """Join PyMuPDF words, removing end-of-line hyphenation ("ex-" + "isting" -> "existing")."""
    parts = []
    for i, word in enumerate(words):
        text = word[4]
        next_word = words[i + 1] if i + 1 < len(words) else None
        line_ends = next_word is not None and next_word[5:7] != word[5:7]
        if line_ends and text.endswith("-") and next_word[4][:1].islower():
            # A word that already has a hyphen is a real compound ("state-of-the-" + "art"): keep it.
            parts.append(text if "-" in text[:-1] else text[:-1])
        else:
            parts.append(text + " ")
    return "".join(parts).strip()

def split_block(words):
    """Split one block's words at sentence ends once a piece reaches the target size."""
    pieces, current = [], []
    for i, word in enumerate(words):
        # Close the piece before a word that would push it past the hard cap.
        if current and len(words_to_text(current + [word])) > MAX_CHUNK_CHARS:
            pieces.append(current)
            current = []
        current.append(word)
        size = len(words_to_text(current))
        next_word = words[i + 1] if i + 1 < len(words) else None
        # A lowercase next word usually means an abbreviation ("e.g.", "et al."), not a sentence end.
        sentence_ends = SENTENCE_END.search(word[4]) and not (next_word and next_word[4][:1].islower())
        if size >= TARGET_CHUNK_CHARS and sentence_ends:
            pieces.append(current)
            current = []
    if current:
        pieces.append(current)
    return pieces

def is_heading(words):
    """Short text without a sentence end, e.g. "1 Introduction" or "3.2 Results"."""
    text = words_to_text(words)
    return len(text) <= MAX_HEADING_CHARS and not SENTENCE_END.search(text)

def line_boxes(words, page, page_no):
    """One box per text line, normalised to the page size (rotation applied)."""
    boxes = []
    for _, line_words in groupby(words, key=lambda w: w[5:7]):
        line_words = list(line_words)
        rect = fitz.Rect(
            min(w[0] for w in line_words), min(w[1] for w in line_words),
            max(w[2] for w in line_words), max(w[3] for w in line_words),
        ) * page.rotation_matrix
        boxes.append(HighlightBox(
            page_no=page_no,
            x0=round(rect.x0 / page.rect.width, 4),
            y0=round(rect.y0 / page.rect.height, 4),
            x1=round(rect.x1 / page.rect.width, 4),
            y1=round(rect.y1 / page.rect.height, 4),
        ))
    return boxes

def build_chunks_from_pdf(pdf_path:str):
    chunks = []

    with fitz.open(pdf_path) as doc:
        for page_no, page in enumerate(doc, start=1):
            # Unsorted on purpose: words come grouped by block, then line, which the
            # groupby calls rely on. sort=True would interleave them.
            words = page.get_text("words")
            pieces = []
            for _, block_words in groupby(words, key=lambda w: w[5]):
                block_words = list(block_words)
                # Skip page numbers and other letterless scraps.
                if sum(c.isalpha() for c in words_to_text(block_words)) < MIN_BLOCK_LETTERS:
                    continue
                pieces.extend(split_block(block_words))

            # Merge neighbouring pieces until the next one would pass the target size.
            # A heading starts a new chunk and always takes the paragraph after it,
            # so it stays with the section it introduces.
            groups, current = [], []
            for piece in pieces:
                size = len(words_to_text(current + piece))
                if current and (
                    (is_heading(piece) and not is_heading(current))
                    or (not is_heading(current) and size > TARGET_CHUNK_CHARS)
                    or size > MAX_CHUNK_CHARS
                ):
                    groups.append(current)
                    current = []
                current = current + piece
            if current:
                # A short leftover (a footer) joins the previous chunk if it fits. A lone
                # heading stays separate: it belongs to the section on the next page.
                if groups and not is_heading(current) and len(words_to_text(current)) < MIN_CHUNK_CHARS \
                        and len(words_to_text(groups[-1] + current)) <= MAX_CHUNK_CHARS:
                    groups[-1] = groups[-1] + current
                else:
                    groups.append(current)

            for group in groups:
                text = words_to_text(group)
                chunks.append(PDFChunk(
                    chunk_id=len(chunks),
                    page_no=page_no,
                    text=text,
                    length=len(text),
                    boxes=line_boxes(group, page, page_no),
                ))

    return chunks
