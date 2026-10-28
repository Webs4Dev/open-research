import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityType = "search" | "ingest" | "analyze" | "ask";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  label: string;
  detail?: string;
  searchId?: number; // search items only: reopens the saved results
  timestamp: number;
}

interface ActivityState {
  items: ActivityItem[];
  logActivity: (item: Omit<ActivityItem, "id" | "timestamp">) => void;
  clearActivity: () => void;
}

const MAX_ITEMS = 8;

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      items: [],
      logActivity: (item) =>
        set((state) => ({
          items: [
            { ...item, id: crypto.randomUUID(), timestamp: Date.now() },
            ...state.items,
          ].slice(0, MAX_ITEMS),
        })),
      clearActivity: () => set({ items: [] }),
    }),
    { name: "openresearch-activity" }
  )
);