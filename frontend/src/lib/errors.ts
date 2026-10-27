import axios from "axios";

// FastAPI sends `detail` as a string for HTTPException and as a list for
// request-validation errors (422).
type ValidationIssue = { loc?: (string | number)[]; msg?: string };

/** Turn any thrown value (usually an axios error) into a message a user can act on. */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return err.code === "ECONNABORTED" || err.code === "ETIMEDOUT"
        ? "The request timed out. Please try again."
        : "Couldn't reach the backend. Check that it's running and reachable.";
    }

    const detail = (err.response.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return (detail as ValidationIssue[])
        .map((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          return field ? `${field}: ${issue.msg}` : issue.msg;
        })
        .join("; ");
    }
    return `Request failed (HTTP ${err.response.status}).`;
  }

  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
