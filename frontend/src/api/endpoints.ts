import { apiClient } from "./client";
import type {
  SearchRequest,
  SearchResponse,
  PDFIngestResponse,
  PDFAnalysisResponse,
  PDFQARequest,
  PDFQAResponse,
  User,
  Credentials,
} from "./types";

// Search ranks every paper with the LLM and analyze scores every chunk, so both
// can take well over a minute on real inputs.
const TIMEOUT_MS = {
  search: 180_000,
  analyze: 180_000,
  ingest: 120_000,
  ask: 60_000,
};

// POST /api/v1/search  (backend/api/routes/search.py)
export async function searchPapers(body: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  const { data } = await apiClient.post<SearchResponse>("/search", body, {
    timeout: TIMEOUT_MS.search,
    signal,
  });
  return data;
}

// GET /api/v1/sources
export async function listSources(): Promise<{ available_sources: string[]; total: number }> {
  const { data } = await apiClient.get("/sources");
  return data;
}

// POST /api/v1/ingest  (multipart/form-data: file)
export async function ingestPdf(file: File, signal?: AbortSignal): Promise<PDFIngestResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<PDFIngestResponse>("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: TIMEOUT_MS.ingest,
    signal,
  });
  return data;
}

// POST /api/v1/analyze  (multipart/form-data: file, project_description)
export async function analyzePdf(
  file: File,
  projectDescription: string,
  signal?: AbortSignal
): Promise<PDFAnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("project_description", projectDescription);
  const { data } = await apiClient.post<PDFAnalysisResponse>("/analyze", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: TIMEOUT_MS.analyze,
    signal,
  });
  return data;
}

// POST /api/v1/ask  (json: paper_id, question)
// paper_id comes from /ingest and is a hash of the PDF's contents, so two
// different files with the same name never share answers.
export async function askQuestion(body: PDFQARequest): Promise<PDFQAResponse> {
  const { data } = await apiClient.post<PDFQAResponse>("/ask", body, { timeout: TIMEOUT_MS.ask });
  return data;
}

// /api/v1/auth/*  (backend/api/routes/auth.py): the session lives in an httpOnly cookie.
export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function login(body: Credentials): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/login", body);
  return data;
}

export async function register(body: Credentials): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/register", body);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
