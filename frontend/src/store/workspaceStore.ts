import { create } from "zustand";

// Analyses are saved on the server (see paperAnalysisKey). The project description draft is
// shared, so it carries over from paper to paper for the browser session.
interface WorkspaceState {
  projectDescription: string;

  setProjectDescription: (text: string) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  projectDescription: "",

  setProjectDescription: (text) => set({ projectDescription: text }),
  reset: () => set({ projectDescription: "" }),
}));
