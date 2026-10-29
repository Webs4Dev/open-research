import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Eye, Menu, X } from "lucide-react";
import { BrandMark, Sidebar } from "./Sidebar";
import { useIsDemo, useLogout } from "../auth/RequireAuth";
import { ErrorBoundary } from "../common/ErrorBoundary";

export function AppShell() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // The paper view (/workspace/<id>) is full width and scrolls inside its own panes (DESIGN.md).
  const fullBleed = /^\/workspace\/[^/]+$/.test(pathname);
  const isDemo = useIsDemo();
  const logoutTo = useLogout();

  // Escape closes the drawer; focus moves into it on open and back to the menu button on close.
  // The page behind is inert while it's open, so Tab can't leave the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const page = pageRef.current;
    if (page) page.inert = true;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      if (page) page.inert = false;
      window.removeEventListener("keydown", onKey);
      menuButtonRef.current?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="w-60 shrink-0 border-r border-hairline bg-surface-1 max-lg:hidden">
        <Sidebar />
      </aside>

      <div ref={pageRef} className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-surface-1 px-4 lg:hidden">
          <BrandMark />
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="btn-ghost w-10 px-0"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
        </header>

        {isDemo && (
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline bg-sky-soft px-4 py-2 text-body-sm text-sky lg:px-10">
            <Eye size={16} className="shrink-0" aria-hidden />
            <p>You're exploring a read-only demo. Searching, uploading and asking are switched off.</p>
            <button
              type="button"
              className="rounded-sm font-semibold underline underline-offset-2 hover:no-underline"
              onClick={() => logoutTo(true)}
            >
              Create your account
            </button>
          </div>
        )}

        <main
          className={
            fullBleed ? "min-h-0 flex-1 overflow-hidden" : "flex-1 overflow-y-auto px-10 py-8 max-lg:px-6 max-sm:px-4 max-sm:py-6"
          }
        >
          <div className={fullBleed ? "h-full" : "mx-auto h-full max-w-[1120px]"}>
            <ErrorBoundary key={pathname}>
              <Suspense
                fallback={
                  <p role="status" className="p-6 text-body-sm text-ink-subtle">
                    Loading…
                  </p>
                }
              >
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-rise bg-ink/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-drawer-in bg-surface-1 shadow-overlay">
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close menu"
              className="btn-ghost absolute right-3 top-5 w-10 px-0"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={20} />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
