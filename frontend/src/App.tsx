import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { SearchPapers } from "./pages/SearchPapers";
import { PdfWorkspace } from "./pages/PdfWorkspace";
import { PaperView } from "./pages/PaperView";
import { NotFound } from "./pages/NotFound";
import { Login } from "./pages/Login";
import { RequireAuth } from "./components/auth/RequireAuth";

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
