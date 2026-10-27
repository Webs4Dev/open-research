import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ErrorBoundary } from "../common/ErrorBoundary";

export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-4xl">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
