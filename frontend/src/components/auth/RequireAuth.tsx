import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getMe } from "../../api/endpoints";
import { getErrorMessage } from "../../lib/errors";

export const ME_QUERY_KEY = ["me"];

/** Renders the app only for a logged-in user; otherwise sends them to /login. */
export function RequireAuth() {
  const location = useLocation();
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, retry: false });

  if (me.isPending) {
    return <p className="p-6 text-sm text-text-secondary">Loading…</p>;
  }
  if (me.isError) {
    if (axios.isAxiosError(me.error) && me.error.response?.status === 401) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    return (
      <div className="p-6 text-sm">
        <p className="mb-2 text-red-600">{getErrorMessage(me.error)}</p>
        <button className="btn-secondary" onClick={() => me.refetch()}>
          Retry
        </button>
      </div>
    );
  }
  return <Outlet />;
}
