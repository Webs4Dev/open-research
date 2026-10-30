import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/endpoints";
import type { User } from "../api/types";
import { useWorkspaceStore } from "../store/workspaceStore";

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
