import { create } from "zustand";
import type { PDFAnalysisResponse } from "../api/types";

export interface SavedAnalysis {
  result: PDFAnalysisResponse;
  description: string; // what it was scored against (the shared draft may have changed since)
}

// Analyses aren't saved on the server (only searches and Q&A are), so they live here for the
// browser session. The project description is shared, so it carries over from paper to paper.
interface WorkspaceState {
  projectDescription: string;
  analyses: Record<string, SavedAnalysis>; // by paper_id

  setProjectDescription: (text: string) => void;
  setAnalysis: (paperId: string, analysis: SavedAnalysis) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  projectDescription: "",
  analyses: {},

  setProjectDescription: (text) => set({ projectDescription: text }),
  setAnalysis: (paperId, analysis) =>
    set((state) => ({ analyses: { ...state.analyses, [paperId]: analysis } })),
  reset: () => set({ projectDescription: "", analyses: {} }),
}));
