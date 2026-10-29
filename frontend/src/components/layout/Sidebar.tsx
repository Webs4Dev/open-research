import { NavLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Search, FileText, LogOut } from "lucide-react";
import type { User } from "../../api/types";
import { ME_QUERY_KEY, useLogout } from "../auth/RequireAuth";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/search", label: "Search papers", icon: Search, end: false },
  { to: "/workspace", label: "PDF workspace", icon: FileText, end: false },
];

export function BrandMark() {
  return (
    <span className="flex items-center gap-2.5 font-display text-h3 text-ink">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-md bg-accent shadow-[inset_0_0_0_1px_theme(colors.hairline.strong)]"
      >
        <img src="/logo.png" alt="" className="h-4 w-4" style={{ filter: "brightness(0)" }} />
      </span>
      OpenResearch
    </span>
  );
}

/** Rail contents, shared by the desktop rail and the mobile drawer. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<User>(ME_QUERY_KEY);
  const handleLogout = useLogout();
  // The demo's address is a placeholder; the banner already says what this account is.
  const accountLabel = user?.is_demo ? "Demo account" : user?.email;

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="mb-8 px-2">
        <BrandMark />
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-10 items-center gap-3 rounded-full px-4 text-body transition duration-fast ${
                isActive
                  ? "bg-accent font-semibold text-on-accent shadow-[inset_0_0_0_1px_theme(colors.hairline.strong)]"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`
            }
          >
            <Icon size={18} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-hairline px-2 pt-4">
        <p className="mb-3 truncate text-body-sm text-ink-subtle" title={accountLabel}>
          {accountLabel}
        </p>
        <button type="button" className="btn-ghost -ml-3" onClick={() => handleLogout()}>
          <LogOut size={16} aria-hidden />
          Log out
        </button>
      </div>
    </div>
  );
}
