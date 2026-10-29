import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div>
      <h1 className="mb-2 font-display text-h2 text-ink">Page not found</h1>
      <p className="mb-4 max-w-[68ch] text-body text-ink-muted">
        This page doesn't exist. Pick a section from the sidebar or head back to the dashboard.
      </p>
      <Link to="/" className="btn">
        Go to dashboard
      </Link>
    </div>
  );
}
