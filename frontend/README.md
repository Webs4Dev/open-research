# OpenResearch frontend

Vite + React + TypeScript + Tailwind app for the research search / PDF workspace platform. Talks to the FastAPI backend in `backend/` over `/api/v1/*`.

## Pages

- `/` — Dashboard, entry points into the two tools.
- `/search` — Search papers: query + optional project description → ranked results (`POST /api/v1/search`).
- `/workspace` — Upload a PDF, then choose **Analyse** or **Ingest and ask**.
  - **Ingest and ask** calls `POST /api/v1/ingest`, then opens an inline chat that calls `POST /api/v1/ask` scoped to that file.
- `/workspace/analyze` — Calls `POST /api/v1/analyze` with the file + your project description, and renders the actual PDF (via `react-pdf`) with the returned chunks highlighted in place. Clicking a highlight or a chunk card syncs the two.

## Local development

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev
```

Run the backend separately, e.g. `uvicorn backend.main:app --reload` (defaults to `http://localhost:8000`), and make sure CORS is enabled there for `http://localhost:5173`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://<your-netlify-site>.netlify.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Deploying to Netlify

1. Push this project to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Set **Base directory** to `frontend` (the app lives in a subfolder). The rest of the build settings are in `frontend/netlify.toml` (`npm run build`, publish `dist`, Node 22), and Netlify picks them up automatically.
4. Under **Site settings → Environment variables**, add `VITE_API_URL` pointing at your deployed backend (e.g. a Render or Railway URL).
5. Deploy. The SPA redirect in `netlify.toml` makes client-side routes like `/workspace` work on refresh.

Your backend needs to be deployed somewhere reachable over HTTPS (Render, Railway, Fly.io, etc.) with CORS allowing your Netlify domain — Netlify only hosts the static frontend, not the Python API.

## Known gaps to close server-side

- `RankingResult` (backend/schemas/ranking.py) has no publication-year field, so the "year" shown on search cards will be blank until that's added to the ranking agent's output — the frontend already handles it as optional.
- In-PDF highlighting matches each chunk's `chunk_text` against the PDF's text layer by substring containment (see `PdfChunkViewer.tsx`). It's reliable but not pixel-exact. For exact bounding-box highlights, have `/analyze` return bounding boxes per chunk instead of relying on client-side text matching.
- `/ask` keys retrieval off `paper_title`, which `/ingest` sets to the raw filename rather than the generated `paper_id`. The frontend passes the ingested filename through as `paper_title` to match — worth unifying on `paper_id` server-side at some point.

## Tech choices

- **Vite + React + TS** — no SSR needed for an internal dashboard hitting your own API.
- **TanStack Query** for request state (loading/error/success) on search, ingest, and analyze.
- **Zustand** for the small bit of state shared across pages (which PDF is active, chat history).
- **react-pdf** (pdf.js) for rendering the uploaded PDF and its text layer for highlighting.
- **Tailwind** for styling, with the app's palette defined once in `tailwind.config.js`.
