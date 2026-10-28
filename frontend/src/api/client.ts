import axios from "axios";
import { queryClient } from "../lib/queryClient";

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
  // Send the httpOnly session cookie, plus the header the backend requires on
  // every state-changing request (its CSRF guard).
  withCredentials: true,
  headers: { "X-Requested-With": "openresearch" },
});

// A 401 anywhere means the session ended (expired or logged out elsewhere):
// refetch /auth/me so RequireAuth sends the user to the login page.
apiClient.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) {
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }
  return Promise.reject(error);
});
