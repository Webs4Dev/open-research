from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes.search import router as search_router
from backend.api.routes.pdf import router as pdf_router

app = FastAPI(
    title="OpenResearch",
    description="Multi-agent research discovery and analysis platform",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5174"],  # add your Netlify URL here once deployed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, prefix="/api/v1", tags=["SEARCH"])
app.include_router(pdf_router, prefix="/api/v1", tags=["PDF"])

@app.get("/health")
def health_check():
    return {"status": "ok"}