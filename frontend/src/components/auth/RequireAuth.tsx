import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getMe } from "../../api/endpoints";
import { getErrorMessage } from "../../lib/errors";
import { ME_QUERY_KEY } from "../../lib/auth";

/** Renders the app only for a logged-in user; otherwise sends them to /login. */
export function RequireAuth() {
  const location = useLocation();
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, retry: false });

  if (me.isPending) {
    return <p role="status" className="p-6 text-body-sm text-ink-subtle">Loading…</p>;
  }
  if (me.isError) {
    // Any failure lands on /login, so visitors always see the sign-in page. A 401 is just "not logged in";
    // anything else (backend down or waking up) is shown there too, before they type a password.
    const notLoggedIn = axios.isAxiosError(me.error) && me.error.response?.status === 401;
    const problem = notLoggedIn ? undefined : getErrorMessage(me.error);
    return <Navigate to="/login" replace state={{ from: location.pathname, problem }} />;
  }
  return <Outlet />;
}
