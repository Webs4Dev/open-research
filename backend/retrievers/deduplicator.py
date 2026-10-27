import re 

from backend.utils.pdf import has_pdf

def normalize_title(title:str):
    title = title.lower()
    title = re.sub(r"[^a-z0-9\s]","",title)
    title = " ".join(title.split())

    return title

def paper_quality(paper):
    """Higher is better: a PDF link first, then any real link, citations, an abstract."""
    url = paper.url or ""
    has_link = url.lower().startswith(("http://", "https://"))
    return (has_link and has_pdf(url), has_link, paper.citation_count, bool(paper.abstract))

def deduplicate_papers(papers):
    # Retrievers finish in any order, so pick the best copy rather than the first one.
    best = {}  # normalized title -> position in unique
    unique = []

    for paper in papers:
        # Non-Latin titles normalize to "", so fall back to the raw title for them.
        normalized = normalize_title(paper.title) or paper.title.strip().casefold()

        if normalized not in best:
            best[normalized] = len(unique)
            unique.append(paper)
        elif paper_quality(paper) > paper_quality(unique[best[normalized]]):
            unique[best[normalized]] = paper

    return unique