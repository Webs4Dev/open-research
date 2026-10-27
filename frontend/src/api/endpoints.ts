import { apiClient } from "./client";
import type {
  SearchRequest,
  SearchResponse,
  PDFIngestResponse,
  PDFAnalysisResponse,
  PDFQARequest,
  PDFQAResponse,
} from "./types";

// POST /api/v1/search  (backend/api/routes/search.py)
export async function searchPapers(body: SearchRequest): Promise<SearchResponse> {
  const { data } = await apiClient.post<SearchResponse>("/search", body);
  return data;
}

// GET /api/v1/sources
export async function listSources(): Promise<{ available_sources: string[]; total: number }> {
  const { data } = await apiClient.get("/sources");
  return data;
}

// POST /api/v1/ingest  (multipart/form-data: file)
export async function ingestPdf(file: File): Promise<PDFIngestResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<PDFIngestResponse>("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// POST /api/v1/analyze  (multipart/form-data: file, project_description)
export async function analyzePdf(
  file: File,
  projectDescription: string
): Promise<PDFAnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("project_description", projectDescription);
  const { data } = await apiClient.post<PDFAnalysisResponse>("/analyze", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// POST /api/v1/ask  (json: paper_id, question)
// paper_id comes from /ingest and is a hash of the PDF's contents, so two
// different files with the same name never share answers.
export async function askQuestion(body: PDFQARequest): Promise<PDFQAResponse> {
  const { data } = await apiClient.post<PDFQAResponse>("/ask", body);
  return data;
}
