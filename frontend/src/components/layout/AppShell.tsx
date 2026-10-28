import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { BrandMark, Sidebar } from "./Sidebar";
import { ErrorBoundary } from "../common/ErrorBoundary";

export function AppShell() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // The paper view (/workspace/<id>) is full width and scrolls inside its own panes (DESIGN.md).
  const fullBleed = /^\/workspace\/[^/]+$/.test(pathname);

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

        <main
          className={
            fullBleed ? "min-h-0 flex-1 overflow-hidden" : "flex-1 overflow-y-auto px-10 py-8 max-lg:px-6 max-sm:px-4 max-sm:py-6"
          }
        >
          <div className={fullBleed ? "h-full" : "mx-auto h-full max-w-[1120px]"}>
            <ErrorBoundary key={pathname}>
              <Outlet />
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
