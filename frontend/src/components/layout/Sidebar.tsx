import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Search, FileText, LogOut } from "lucide-react";
import { logout } from "../../api/endpoints";
import type { User } from "../../api/types";
import { ME_QUERY_KEY } from "../auth/RequireAuth";
import { useActivityStore } from "../../store/activityStore";
import { useWorkspaceStore } from "../../store/workspaceStore";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/search", label: "Search papers", icon: Search, end: false },
  { to: "/workspace", label: "PDF workspace", icon: FileText, end: false },
];

export function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<User>(ME_QUERY_KEY);

  const handleLogout = async () => {
    await logout().catch(() => {}); // the cookie is cleared server-side; leave either way
    queryClient.clear(); // drop every cached response from this user
    // The activity list is kept in localStorage, so clear it for whoever logs in next.
    useActivityStore.getState().clearActivity();
    useWorkspaceStore.getState().reset();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-1 px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2 text-[15px] font-medium">
        <img
          src="/logo.png"
          alt="OpenResearch logo"
          className="h-5 w-5"
          style={{ filter: "brightness(0)" }}
        />
        OpenResearch
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded px-2.5 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-surface-2 font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface-2/60"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border px-2 pt-3">
        <p className="mb-2 truncate text-xs text-text-secondary" title={user?.email}>
          {user?.email}
        </p>
        <button className="btn-secondary w-full px-2.5 py-1.5 text-xs" onClick={handleLogout}>
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </aside>
  );
}
