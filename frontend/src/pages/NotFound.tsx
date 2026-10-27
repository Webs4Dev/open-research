import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div>
      <h1 className="mb-2 text-xl font-medium">Page not found</h1>
      <p className="mb-4 text-sm text-text-secondary">
        This page doesn't exist. Pick a section from the sidebar or head back to the dashboard.
      </p>
      <Link to="/" className="btn-secondary">
        Go to dashboard
      </Link>
    </div>
  );
}
