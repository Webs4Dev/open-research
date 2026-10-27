/**
 * These types mirror backend/schemas/*.py field-for-field.
 * If you change a Pydantic model, update the matching type here.
 */

// ---- Search (backend/schemas/report.py, ranking.py) ----

export interface SearchRequest {
  query: string;
  project_description?: string | null;
  max_results?: number;
  sources?: string[] | null;
}

export interface Scores {
  topic_match: number;
  project_relevance: number;
  research_similarity: number;
  recency: number;
  potential_value: number;
  pdf_availability: number;
}

export interface RankingResult {
  paper_name: string;
  source: string;
  pdf_status: string;
  paper_url?: string | null;
  scores: Scores;
  total_score: number;
  why_it_matches: string[];
  useful_ideas: string[];
  pdf_usefulness: string;
  published_year?: number | null;
}

export interface SourceReport {
  count: number;
  status: string;
  retrieval_type: string;
  duration: number;
  error?: string | null;
}

export interface RetrievalStats {
  total_papers: number;
  unique_papers: number;
  duplicate_papers_removed: number;
  successful_sources: number;
  failed_sources: number;
}

export interface SearchResponse {
  query: string;
  sources_requested: string[];
  total_papers_retrieved: number;
  total_ranked: number;
  source_report: Record<string, SourceReport>;
  retrieval_stats: RetrievalStats;
  ranked_results: RankingResult[];
}

// ---- PDF ingest / analyze / ask (backend/schemas/pdf.py, relevance.py) ----

export interface PDFIngestResponse {
  filename: string;
  paper_id: string;
  pages: number;
  chunks_stored: number;
}

export interface User {
  id: number;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}

// One text line of a chunk, as fractions (0-1) of the page width/height.
export interface HighlightBox {
  page_no: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RelevantChunk {
  chunk_id: number;
  chunk_text?: string | null;
  page_no?: number | null;
  relevance_score: number;
  chunk_type: string;
  reason: string;
  suggested_use: string;
  boxes: HighlightBox[];
}

export interface PDFAnalysisResponse {
  filename: string;
  paper_id: string;
  pages: number;
  chunk_count: number;
  relevant_chunks: RelevantChunk[];
}

export interface PDFQARequest {
  paper_id: string;
  question: string;
}

export interface PDFQAResponse {
  answer: string;
  confidence: number;
  found_in_chunks: number[];
  found_in_pages: number[];
}
