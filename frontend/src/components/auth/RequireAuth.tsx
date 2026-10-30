import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../api/endpoints";
import { ME_QUERY_KEY } from "../../lib/auth";

/** Renders the app only for a logged-in user; otherwise sends them to /login. */
export function RequireAuth() {
  const location = useLocation();
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, retry: false });

  if (me.isPending) {
    return <p role="status" className="p-6 text-body-sm text-ink-subtle">Loading…</p>;
  }
  if (me.isError) {
    // Any failure lands on /login, so visitors always see the sign-in page. If the backend is down,
    // the login form and "Try the demo" show that error when used, not before.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
