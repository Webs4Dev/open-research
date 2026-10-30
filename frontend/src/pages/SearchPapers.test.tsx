import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { SearchResponse } from "../api/types";
import { SearchPapers } from "./SearchPapers";

vi.mock("../api/endpoints", () => ({
  listSources: vi.fn(async () => ({ available_sources: ["arxiv", "pubmed", "openalex"], total: 3 })),
  getSavedSearch: vi.fn(async (id: number): Promise<SearchResponse> => ({
    query: "agent memory",
    // "web" was removed from the backend since this search ran, so it must not come back as a chip.
    sources_requested: ["arxiv", "web"],
    total_papers_retrieved: 0,
    total_ranked: 0,
    source_report: {},
    retrieval_stats: { total_papers: 0, unique_papers: 0, duplicate_papers_removed: 0, successful_sources: 1, failed_sources: 0 },
    ranked_results: [],
    search_id: id,
  })),
  searchPapers: vi.fn(),
}));

function renderAt(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <SearchPapers />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("SearchPapers", () => {
  it("refills the form from a saved search, keeping only sources that still exist", async () => {
    renderAt("/search?id=7");

    expect(await screen.findByDisplayValue("agent memory")).toBeTruthy();
    // A saved search docks the form above its results, folding the chips into a summary.
    fireEvent.click(screen.getByRole("button", { name: /arXiv, 5 per source/ }));
    expect(screen.getByRole("button", { name: "arXiv", pressed: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PubMed", pressed: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: "All sources", pressed: false })).toBeTruthy();
  });

  it("keeps the user's edits when /sources refetches after restoring", async () => {
    const queryClient = renderAt("/search?id=7");
    const input = await screen.findByDisplayValue("agent memory");
    fireEvent.change(input, { target: { value: "new topic" } });
    await act(() => queryClient.refetchQueries({ queryKey: ["sources"] })); // e.g. on window refocus
    expect(screen.getByLabelText("What are you researching?")).toHaveProperty("value", "new topic");
  });

  it("starts empty without a saved search", async () => {
    renderAt("/search");
    expect(await screen.findByRole("button", { name: "All sources", pressed: true })).toBeTruthy();
    expect(screen.getByLabelText("What are you researching?")).toHaveProperty("value", "");
  });
});
