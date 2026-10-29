import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getMe, logout } from "../../api/endpoints";
import type { User } from "../../api/types";
import { ErrorPanel } from "../common/ErrorPanel";
import { getErrorMessage } from "../../lib/errors";
import { useWorkspaceStore } from "../../store/workspaceStore";

export const ME_QUERY_KEY = ["me"];

// Tooltip on controls that would spend credits or change the shared demo data (the server refuses them too).
export const DEMO_HINT = "Not available in the read-only demo";

/** True for the shared read-only demo account. A plain cache read is enough: RequireAuth has loaded `me`
 * before any page renders, and every account change goes through /login, which remounts the pages. */
export function useIsDemo(): boolean {
  return useQueryClient().getQueryData<User>(ME_QUERY_KEY)?.is_demo ?? false;
}

/** Logs out and goes to /login; `openRegister` opens the create-account form there. */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async (openRegister = false) => {
    await logout().catch(() => {}); // the cookie is cleared server-side; leave either way
    queryClient.clear(); // drop every cached response from this user
    useWorkspaceStore.getState().reset();
    navigate("/login", { replace: true, state: openRegister ? { mode: "register" } : undefined });
  };
}

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
