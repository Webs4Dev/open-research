from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes.search import router as search_router
from backend.api.routes.pdf import router as pdf_router
from backend.api.routes.auth import router as auth_router
from backend.api.routes.history import router as history_router
from backend.auth import block_demo_writes
from backend.db import init_db
from backend.demo import DEMO_ENABLED, seed_demo
from backend.utils.logger import log

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if DEMO_ENABLED:
        try:
            seed_demo()
        except Exception as e:  # the demo is optional: without a demo user, /auth/demo just returns 404
            log(f"Demo seeding failed, demo disabled: {e}")
    yield

app = FastAPI(
    title="OpenResearch",
    description="Multi-agent research discovery and analysis platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5174"],  # add your Netlify URL here once deployed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSRF guard for the session cookie: a cross-site form can't set custom headers, and
# a cross-site fetch that does is blocked by the CORS preflight. So any state-changing
# request without this header didn't come from our frontend.
CSRF_HEADER = "X-Requested-With"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

@app.middleware("http")
async def require_csrf_header(request: Request, call_next):
    if request.method not in SAFE_METHODS and request.headers.get(CSRF_HEADER) != "openresearch":
        return JSONResponse(status_code=403, content={"detail": "Missing CSRF header"})
    return await call_next(request)

# Every feature route needs a logged-in user; only /auth/* and /health are public.
# block_demo_writes resolves current_user too, and also keeps the demo account read-only.
login_required = [Depends(block_demo_writes)]
app.include_router(auth_router, prefix="/api/v1", tags=["AUTH"])
app.include_router(search_router, prefix="/api/v1", tags=["SEARCH"], dependencies=login_required)
app.include_router(pdf_router, prefix="/api/v1", tags=["PDF"], dependencies=login_required)
app.include_router(history_router, prefix="/api/v1", tags=["HISTORY"], dependencies=login_required)

@app.get("/health")
def health_check():
    return {"status": "ok"}