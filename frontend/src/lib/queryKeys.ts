// Shared TanStack Query keys for the saved history, so the page that creates an entry
// (a search, an upload) can refresh the Dashboard's list.
export const HISTORY_SEARCHES_KEY = ["history", "searches"] as const;
export const HISTORY_PAPERS_KEY = ["history", "papers"] as const;
