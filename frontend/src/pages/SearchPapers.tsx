import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search as SearchIcon, ExternalLink } from "lucide-react";
import { searchPapers, listSources, getSavedSearch } from "../api/endpoints";
import type { RankingResult } from "../api/types";
import { ScoreBadge } from "../components/common/ScoreBadge";
import { Spinner } from "../components/common/Spinner";
import { useActivityStore } from "../store/activityStore";
import { getErrorMessage, isCancelled } from "../lib/errors";
import { useAbortController } from "../lib/useAbortController";

// Each paper costs one LLM ranking call, so keep this small.
const MAX_RESULTS_PER_SOURCE = 10;

// Retrievers use the placeholder "Not Available" when a paper has no link.
function isRealUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

export function SearchPapers() {
  const [query, setQuery] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [maxResults, setMaxResults] = useState(5);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // Populated from GET /api/v1/sources so this list never drifts from the backend.
  const sourcesQuery = useQuery({
    queryKey: ["sources"],
    queryFn: listSources,
  });

  // ?id=N points at a search saved by the backend, so reopening it (from Recent activity,
  // a refresh or the back button) shows its results without re-running the LLM ranking.
  const [searchParams, setSearchParams] = useSearchParams();
  const savedId = Number(searchParams.get("id")) || null;
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: ["search", savedId],
    queryFn: () => getSavedSearch(savedId!),
    enabled: savedId !== null,
    staleTime: Infinity, // a saved search never changes
    retry: false, // a 404 (deleted or not yours) won't succeed on retry
  });

  useEffect(() => {
    if (savedQuery.data) setQuery(savedQuery.data.query);
  }, [savedQuery.data]);

  const logActivity = useActivityStore((s) => s.logActivity);
  const { nextSignal, cancel } = useAbortController();

  const mutation = useMutation({
    mutationFn: () =>
      searchPapers(
        {
          query,
          project_description: projectDescription || undefined,
          max_results: maxResults,
          sources: selectedSources.length > 0 ? selectedSources : undefined,
        },
        nextSignal()
      ),
    onSuccess: (data) => {
      const searchId = data.search_id ?? undefined;
      logActivity({
        type: "search",
        label: query,
        detail: `${data.total_ranked} result${data.total_ranked === 1 ? "" : "s"}`,
        searchId,
      });
      if (searchId) {
        queryClient.setQueryData(["search", searchId], data);
        setSearchParams({ id: String(searchId) });
      } else {
        setSearchParams({});
      }
    },
  });

  // The URL's saved search, or the fresh result only if the backend didn't return an id
  // (so a bare /search, e.g. after Back, stays blank). Hidden while a new search runs or failed.
  const shown =
    mutation.isPending || mutation.isError
      ? undefined
      : savedId
        ? savedQuery.data
        : mutation.data?.search_id
          ? undefined
          : mutation.data;

  const handleSearch = () => {
    if (!query.trim()) return;
    mutation.mutate();
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const results: RankingResult[] = shown?.ranked_results ?? [];

  return (
    <div>
      <h1 className="mb-4 text-xl font-medium">Search papers</h1>

      <input
        className="input mb-2"
        placeholder="What are you researching?"
        maxLength={500}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
      <textarea
        className="textarea mb-3 h-14"
        placeholder="Project description (optional) — helps rank results against your project"
        maxLength={2000}
        value={projectDescription}
        onChange={(e) => setProjectDescription(e.target.value)}
      />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">
            Results per source
          </label>
          <input
            type="number"
            min={1}
            max={MAX_RESULTS_PER_SOURCE}
            className="input"
            value={maxResults}
            onChange={(e) =>
              setMaxResults(
                Math.min(MAX_RESULTS_PER_SOURCE, Math.max(1, Number(e.target.value) || 1))
              )
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">
            Sources {selectedSources.length === 0 && "(all)"}
          </label>
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded border border-border p-2">
            {sourcesQuery.isLoading && (
              <span className="text-xs text-text-muted">Loading sources…</span>
            )}
            {sourcesQuery.isError && (
              <span className="text-xs text-red-600">
                Couldn't load sources: {getErrorMessage(sourcesQuery.error)}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => sourcesQuery.refetch()}
                >
                  Retry
                </button>
              </span>
            )}
            {sourcesQuery.data?.available_sources.map((source) => {
              const isSelected = selectedSources.includes(source);
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    isSelected
                      ? "bg-text-accent text-white"
                      : "bg-surface-1 text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  {source}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        className="btn mb-6"
        onClick={handleSearch}
        disabled={mutation.isPending || !query.trim()}
      >
        <SearchIcon size={15} />
        Search
      </button>

      {mutation.isPending && <Spinner label="Retrieving and ranking papers…" onCancel={cancel} />}

      {mutation.isError && isCancelled(mutation.error) && (
        <p className="text-sm text-text-muted">Search cancelled.</p>
      )}

      {mutation.isError && !isCancelled(mutation.error) && (
        <p className="text-sm text-red-600">
          Search failed: {getErrorMessage(mutation.error)}
        </p>
      )}

      {!mutation.isPending && savedQuery.isLoading && <Spinner label="Loading saved search…" />}

      {!mutation.isPending && savedQuery.isError && (
        <p className="text-sm text-red-600">
          Couldn't load this search: {getErrorMessage(savedQuery.error)}
        </p>
      )}

      {shown && (
        <>
          <p className="mb-3 text-sm text-text-muted">
            {shown.total_ranked} ranked result{shown.total_ranked === 1 ? "" : "s"}
          </p>
          <div className="flex flex-col gap-2.5">
            {results.map((paper, i) => (
              <ResultCard key={`${paper.paper_name}-${i}`} paper={paper} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ResultCard({ paper }: { paper: RankingResult }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium leading-snug">{paper.paper_name}</p>
        <ScoreBadge score={paper.total_score} />
      </div>

      <p className="mt-1.5 text-sm text-text-secondary">
        {paper.source}
        {paper.published_year ? ` · ${paper.published_year}` : ""}
        {isRealUrl(paper.paper_url) && (
          <>
            {" · "}
            <a
              href={paper.paper_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-text-accent hover:underline"
            >
              {paper.pdf_status === "available" ? "PDF" : "Link"} <ExternalLink size={12} />
            </a>
          </>
        )}
      </p>

      {paper.why_it_matches.length > 0 && (
        <p className="mt-1.5 text-sm text-text-secondary">{paper.why_it_matches[0]}</p>
      )}
    </div>
  );
}