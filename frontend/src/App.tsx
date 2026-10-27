import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { SearchPapers } from "./pages/SearchPapers";
import { PdfWorkspace } from "./pages/PdfWorkspace";
import { Analyze } from "./pages/Analyze";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPapers />} />
        <Route path="/workspace" element={<PdfWorkspace />} />
        <Route path="/workspace/analyze" element={<Analyze />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
