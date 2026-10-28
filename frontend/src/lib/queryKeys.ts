// Shared TanStack Query keys for the saved history, so the page that creates an entry
// (a search, an upload) can refresh the Dashboard's list.
export const HISTORY_SEARCHES_KEY = ["history", "searches"] as const;
export const HISTORY_PAPERS_KEY = ["history", "papers"] as const;
// Not under HISTORY_PAPERS_KEY, so refreshing the papers list doesn't refetch every Q&A thread.
export const paperQAKey = (paperId: string) => ["paper-qa", paperId] as const;
export const paperFileKey = (paperId: string) => ["paper-file", paperId] as const;
