import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { SearchPapers } from "./pages/SearchPapers";
import { PdfWorkspace } from "./pages/PdfWorkspace";
import { NotFound } from "./pages/NotFound";
import { Login } from "./pages/Login";
import { RequireAuth } from "./components/auth/RequireAuth";

const RELOADED_KEY = "chunk-reloaded";

// After a redeploy the old hashed chunk is gone, and React.lazy caches the failure, so "Try again"
// can't recover. Reload once to get the new index.html; the flag stops a loop when truly offline.
function loadOrReload<T>(load: () => Promise<T>): Promise<T> {
  return load().then(
    (module) => {
      sessionStorage.removeItem(RELOADED_KEY);
      return module;
    },
    (error) => {
      if (sessionStorage.getItem(RELOADED_KEY)) throw error;
      sessionStorage.setItem(RELOADED_KEY, "1");
      window.location.reload();
      return new Promise<T>(() => {}); // keep the Suspense fallback up until the reload happens
    }
  );
}

// The paper view pulls in pdf.js (most of the bundle), so it loads only when a paper is opened.
const PaperView = lazy(() =>
  loadOrReload(() => import("./pages/PaperView")).then((m) => ({ default: m.PaperView }))
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPapers />} />
        <Route path="/workspace" element={<PdfWorkspace />} />
        <Route path="/workspace/analyze" element={<Navigate to="/workspace" replace />} />
        <Route path="/workspace/:paperId" element={<PaperView />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      </Route>
    </Routes>
  );
}
