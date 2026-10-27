RANKING_PROMPT = """
You are a research paper relevance scoring agent. Evaluate the paper below against the user's query and return a structured JSON response.

---

USER QUERY:
{query}

USER PROJECT DETAILS: (Use this field if details given else ignore if None)
{project_description}

PAPER:
Title: {paper.title}
Abstract: {abstract}
Published year: {year}
Citations: {paper.citation_count}
Source: {paper.source}
PDF status: {pdf_status}

---

SCORING RUBRIC (reduce score if information is insufficient to judge):

| Criterion            | Max | Guidance |
|---------------------|-----|----------|
| topic_match         | 25  | Overlap of core concepts with the query |
| project_relevance   | 25  | Direct utility for building the user's project |
| research_similarity | 15  | Similar problem framing or methodology |
| recency             | 10  | Favor newer papers for fast-moving fields |
| potential_value     | 10  | Insights, techniques, or inspiration it could offer |
| pdf_availability    | 15  | Full PDF present and suitable for deep analysis (Q&A, highlighting, idea extraction) |

Note: Score `pdf_availability` higher only if PDF status is "available".

---

INSTRUCTIONS:
- Do NOT hallucinate. Score only what the abstract and metadata support.
- Be concise. Bullet points should be under 10 words each.
- Return ONLY valid JSON. No markdown, no explanation outside the JSON.

---

OUTPUT FORMAT:
{{
  "scores": {{
    "topic_match": <0–25>,
    "project_relevance": <0–25>,
    "research_similarity": <0–15>,
    "recency": <0–10>,
    "potential_value": <0–10>,
    "pdf_availability": <0–15>
  }},
  "why_it_matches": [
    "<bullet>",
    "<bullet>"
  ],
  "useful_ideas": [
    "<bullet>",
    "<bullet>"
  ],
  "pdf_usefulness": "<one sentence: what deeper analysis the PDF would enable, or why it adds no value>"
}}
"""