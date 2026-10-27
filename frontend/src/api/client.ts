import axios from "axios";

/**
 * Base URL for the FastAPI backend. Set VITE_API_URL in a .env file locally
 * and as an environment variable in Netlify's site settings.
 * Falls back to localhost for local development against `uvicorn backend.main:app`.
 */
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  // Default for quick calls; slow endpoints set their own timeout in endpoints.ts.
  timeout: 30_000,
});
