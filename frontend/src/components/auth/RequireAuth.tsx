import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getMe } from "../../api/endpoints";
import { ErrorPanel } from "../common/ErrorPanel";
import { getErrorMessage } from "../../lib/errors";

export const ME_QUERY_KEY = ["me"];

/** Renders the app only for a logged-in user; otherwise sends them to /login. */
export function RequireAuth() {
  const location = useLocation();
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, retry: false });

  if (me.isPending) {
    return <p role="status" className="p-6 text-body-sm text-ink-subtle">Loading…</p>;
  }
  if (me.isError) {
    if (axios.isAxiosError(me.error) && me.error.response?.status === 401) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    return (
      <div className="p-6">
        <ErrorPanel message={getErrorMessage(me.error)} onRetry={() => me.refetch()} />
      </div>
    );
  }
  return <Outlet />;
}
