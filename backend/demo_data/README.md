# Demo account data

Seeded into the read-only demo account on every startup (`backend/demo.py`), so the
demo survives a redeploy that wipes the database.

- `fixture.json`: one saved search, one paper analysis and its Q&A, exported from a real
  test account (real LLM output, so seeding costs nothing).
- `mirix-2507.07957.pdf`: the paper the analysis and Q&A are about. Its `paper_id` is the
  first 16 hex characters of the file's SHA-256, so the file must stay byte-identical.

## Credit

The PDF is **"MIRIX: Multi-Agent Memory System for LLM-Based Agents"** by Yu Wang and Xi Chen
(arXiv:2507.07957, 2025), https://arxiv.org/abs/2507.07957, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It is redistributed unmodified.
