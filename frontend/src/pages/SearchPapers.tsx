import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowUp, Check, ChevronDown, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { searchPapers, listSources, getSavedSearch } from "../api/endpoints";
import type { SearchResponse } from "../api/types";
import { ResultCard } from "../components/search/ResultCard";
import { Spinner } from "../components/common/Spinner";
import { ErrorPanel } from "../components/common/ErrorPanel";
import { getErrorMessage, isCancelled } from "../lib/errors";
import { useAbortController } from "../lib/useAbortController";
import { sourceMeta } from "../lib/sources";
import { HISTORY_SEARCHES_KEY } from "../lib/queryKeys";

// Each paper costs one LLM ranking call, so keep this small.
const MAX_RESULTS_PER_SOURCE = 10;

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

  // Refill the form from the saved search, so "Search" re-runs it as it was. Once per search (after
  // the source list settles), so a late /sources response can't overwrite the user's edits.
  // No chips selected means all sources, so a search that used every source restores as none selected.
  const allSources = sourcesQuery.data?.available_sources;
  const restoredId = useRef<number | null>(null);
  useEffect(() => {
    if (!savedQuery.data || sourcesQuery.isPending || restoredId.current === savedId) return;
    restoredId.current = savedId;
    setQuery(savedQuery.data.query);
    if (!allSources) return; // /sources failed: no chips to restore
    const requested = savedQuery.data.sources_requested.filter((s) => allSources.includes(s)); // drop removed sources
    setSelectedSources(requested.length === allSources.length ? [] : requested);
  }, [savedQuery.data, sourcesQuery.isPending, allSources, savedId]);

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
      queryClient.invalidateQueries({ queryKey: HISTORY_SEARCHES_KEY }); // the Dashboard list
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
    if (!query.trim() || mutation.isPending) return;
    mutation.mutate();
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  // Landing = nothing to show and nothing on its way: the headline and centred omnibox.
  // Otherwise the omnibox docks to the top and results flow below it.
  const isLanding = !shown && !mutation.isPending && !mutation.isError && savedId === null;

  return (
    <div className={isLanding ? "flex min-h-full flex-col justify-center py-10" : "pb-16"}>
      <div className={`mx-auto w-full max-w-4xl ${isLanding ? "" : "pt-2"}`}>
        {isLanding && (
          <header className="mb-8 animate-rise">
            <h1 className="max-w-3xl text-balance font-display text-display text-ink max-sm:text-display-sm">
              Find the papers your project actually needs.
            </h1>
            <p className="mt-4 max-w-[60ch] text-body-lg text-ink-muted">
              One search across arXiv, Semantic Scholar, PubMed, OpenAlex, Crossref and the web.
              Every paper is scored against what you're building.
            </p>
          </header>
        )}
        {/* The visible headline is landing-only; keep one h1 for screen readers once results show. */}
        {!isLanding && <h1 className="sr-only">Search papers</h1>}

        <SearchForm
          query={query}
          onQueryChange={setQuery}
          projectDescription={projectDescription}
          onProjectDescriptionChange={setProjectDescription}
          maxResults={maxResults}
          onMaxResultsChange={setMaxResults}
          sources={sourcesQuery.data?.available_sources}
          sourcesLoading={sourcesQuery.isLoading}
          sourcesError={sourcesQuery.isError ? getErrorMessage(sourcesQuery.error) : null}
          onRetrySources={() => sourcesQuery.refetch()}
          selectedSources={selectedSources}
          onToggleSource={toggleSource}
          onClearSources={() => setSelectedSources([])}
          onSubmit={handleSearch}
          isPending={mutation.isPending}
          compact={!isLanding}
        />
      </div>

      <div className="mx-auto mt-10 w-full max-w-4xl">
        {mutation.isPending && (
          <Spinner label="Searching every source and ranking each paper…" onCancel={cancel} />
        )}

        {mutation.isError && isCancelled(mutation.error) && (
          <p className="text-body text-ink-subtle">Search cancelled. Edit the query or run it again.</p>
        )}

        {mutation.isError && !isCancelled(mutation.error) && (
          <ErrorPanel message={`Search failed: ${getErrorMessage(mutation.error)}`} onRetry={handleSearch} />
        )}

        {!mutation.isPending && savedQuery.isLoading && <Spinner label="Opening saved search…" />}

        {!mutation.isPending && savedQuery.isError && (
          <ErrorPanel message={`Couldn't open this search: ${getErrorMessage(savedQuery.error)}`} />
        )}

        {/* A new search sets only ?id=, which clears the sort and filter params too. */}
        {shown && <Results key={shown.search_id ?? "fresh"} response={shown} />}
      </div>
    </div>
  );
}

interface SearchFormProps {
  query: string;
  onQueryChange: (q: string) => void;
  projectDescription: string;
  onProjectDescriptionChange: (d: string) => void;
  maxResults: number;
  onMaxResultsChange: (n: number) => void;
  sources?: string[];
  sourcesLoading: boolean;
  sourcesError: string | null;
  onRetrySources: () => void;
  selectedSources: string[];
  onToggleSource: (s: string) => void;
  onClearSources: () => void;
  onSubmit: () => void;
  isPending: boolean;
  /** Docked above results: sources and limits fold into a one-line summary. */
  compact: boolean;
}

function SearchForm(props: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showContext, setShowContext] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const contextOpen = showContext || props.projectDescription.length > 0;
  const optionsOpen = !props.compact || showOptions;

  const sourceSummary =
    props.selectedSources.length === 0
      ? "All sources"
      : props.selectedSources.map((s) => sourceMeta(s).label).join(", ");

  // ⌘K / Ctrl+K focuses the omnibox from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clampResults = (n: number) => props.onMaxResultsChange(Math.min(MAX_RESULTS_PER_SOURCE, Math.max(1, n)));

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
    >
      {/* The one bold moment: aurora glow behind the omnibox while it has focus. */}
      <div className="group relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-[32px] bg-aurora opacity-0 blur-xl transition-opacity duration-slow ease-out group-focus-within:opacity-25"
        />
        <div className="relative flex h-16 items-center gap-2 rounded-xl border border-hairline-strong bg-surface-1 pl-5 pr-2 transition-colors duration-fast group-focus-within:border-accent-ink">
          <label htmlFor="search-query" className="sr-only">
            What are you researching?
          </label>
          <input
            id="search-query"
            ref={inputRef}
            className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-ink outline-none placeholder:text-ink-subtle focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="What are you researching?"
            maxLength={500}
            autoComplete="off"
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
          />
          <kbd className="rounded-sm border border-hairline-strong bg-surface-2 px-1.5 py-0.5 font-mono text-label text-ink-subtle max-sm:hidden">
            ⌘K
          </kbd>
          <button
            type="submit"
            aria-label="Search"
            disabled={props.isPending || !props.query.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-[inset_0_0_0_1px_theme(colors.hairline.strong)] transition duration-base ease-spring hover:bg-accent-hover active:scale-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-faint disabled:shadow-none"
          >
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {contextOpen ? (
        <div className="mt-3 animate-rise">
          <label htmlFor="search-context" className="mb-1.5 block text-label text-ink-subtle">
            Your project (optional). Papers are ranked against it.
          </label>
          <textarea
            id="search-context"
            className="textarea h-24"
            placeholder="e.g. A memory system for LLM agents that stores episodic and semantic memories separately"
            maxLength={2000}
            value={props.projectDescription}
            onChange={(e) => props.onProjectDescriptionChange(e.target.value)}
          />
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-2">
        {!contextOpen && (
          <button type="button" className="btn-ghost -ml-3" onClick={() => setShowContext(true)}>
            <Plus size={16} aria-hidden />
            Describe your project for better ranking
          </button>
        )}
        {props.compact && (
          <button
            type="button"
            className={`btn-ghost text-body-sm ${contextOpen ? "-ml-3" : ""}`}
            aria-expanded={showOptions}
            onClick={() => setShowOptions((v) => !v)}
          >
            <SlidersHorizontal size={16} aria-hidden />
            <span className="max-w-[40ch] truncate">
              {sourceSummary}, {props.maxResults} per source
            </span>
            <ChevronDown
              size={16}
              aria-hidden
              className={`transition-transform duration-base ease-spring ${showOptions ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {optionsOpen && (
      <div className={`mt-4 flex flex-col gap-4 ${props.compact ? "animate-rise" : ""}`}>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-label text-ink-subtle">Sources</legend>
          {/* Always one row: fits on desktop, scrolls sideways on phones. The padding keeps focus rings unclipped. */}
          <div className="-m-1 flex gap-2 overflow-x-auto p-1 max-sm:-mx-4 max-sm:px-4">
            {props.sourcesLoading && <span className="text-body-sm text-ink-subtle">Loading sources…</span>}
            {props.sourcesError && (
              <span className="text-body-sm text-red">
                Couldn't load sources: {props.sourcesError}{" "}
                <button type="button" className="font-medium underline" onClick={props.onRetrySources}>
                  Retry
                </button>
              </span>
            )}
            {props.sources && (
              <SourceToggle
                label="All sources"
                selected={props.selectedSources.length === 0}
                selectedClass="bg-accent-soft text-accent-ink"
                onClick={props.onClearSources}
              />
            )}
            {props.sources?.map((source) => {
              const meta = sourceMeta(source);
              return (
                <SourceToggle
                  key={source}
                  label={meta.label}
                  dotClass={meta.dot}
                  selected={props.selectedSources.includes(source)}
                  selectedClass={meta.chip}
                  onClick={() => props.onToggleSource(source)}
                />
              );
            })}
          </div>
        </fieldset>

        <div>
          <p id="per-source-label" className="mb-2 text-label text-ink-subtle">
            Papers per source
          </p>
          <div
            role="group"
            aria-labelledby="per-source-label"
            className="flex h-7 w-fit items-center rounded-full border border-hairline-strong bg-surface-1"
          >
            <button
              type="button"
              aria-label="Fewer papers per source"
              className="grid h-7 w-8 place-items-center rounded-l-full text-ink-muted hover:bg-surface-2 disabled:text-ink-faint"
              disabled={props.maxResults <= 1}
              onClick={() => clampResults(props.maxResults - 1)}
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-mono text-mono tabular-nums" aria-live="polite">
              {props.maxResults}
            </span>
            <button
              type="button"
              aria-label="More papers per source"
              className="grid h-7 w-8 place-items-center rounded-r-full text-ink-muted hover:bg-surface-2 disabled:text-ink-faint"
              disabled={props.maxResults >= MAX_RESULTS_PER_SOURCE}
              onClick={() => clampResults(props.maxResults + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
      )}
    </form>
  );
}

interface SourceToggleProps {
  label: string;
  selected: boolean;
  selectedClass: string;
  dotClass?: string;
  onClick: () => void;
}

function SourceToggle({ label, selected, selectedClass, dotClass, onClick }: SourceToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`chip transition duration-base ease-spring active:scale-95 ${
        selected
          ? `${selectedClass} font-semibold`
          : "border border-hairline-strong bg-surface-1 text-ink-muted hover:bg-surface-2"
      }`}
    >
      {selected ? (
        <Check size={12} strokeWidth={3} aria-hidden />
      ) : (
        dotClass && <span aria-hidden className={`h-2 w-2 rounded-full ${dotClass}`} />
      )}
      {label}
    </button>
  );
}

type SortKey = "score" | "newest";

function Results({ response }: { response: SearchResponse }) {
  // Sort and filters live in the URL next to ?id=, so a refresh or coming Back from a paper keeps them.
  const [params, setParams] = useSearchParams();
  const sort: SortKey = params.get("sort") === "newest" ? "newest" : "score";
  const pdfOnly = params.get("pdf") === "1";
  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true } // a filter click isn't a new page for the Back button
    );

  // A Set, because several web_* sources share the label "Web".
  const failedSources = [
    ...new Set(
      Object.entries(response.source_report)
        .filter(([, report]) => report.status === "error")
        .map(([name]) => sourceMeta(name).label)
    ),
  ];

  // Sources actually present in these results, with counts, for the filter chips.
  const sourceCounts = new Map<string, number>();
  for (const paper of response.ranked_results) {
    const key = sourceMeta(paper.source).label;
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  // Only a source with a visible chip can filter; a stale ?source= would hide everything with no way to clear it.
  const rawSource = params.get("source");
  const sourceFilter = rawSource && sourceCounts.size > 1 && sourceCounts.has(rawSource) ? rawSource : null;

  // filter() returns a new array, so sorting it in place leaves the response untouched.
  const visible = response.ranked_results
    .filter((p) => (!pdfOnly || p.pdf_status === "available") && (!sourceFilter || sourceMeta(p.source).label === sourceFilter))
    .sort((a, b) =>
      sort === "newest" ? (b.published_year ?? 0) - (a.published_year ?? 0) : b.total_score - a.total_score
    );

  const { duplicate_papers_removed: duplicates, successful_sources: sourcesOk } = response.retrieval_stats;

  return (
    <section aria-labelledby="results-heading">
      <h2 id="results-heading" className="font-display text-h2 text-ink">
        {response.total_ranked === 0
          ? "No papers found"
          : `${response.total_ranked} paper${response.total_ranked === 1 ? "" : "s"} ranked`}
      </h2>
      <p className="mt-1 text-body text-ink-muted">
        From {sourcesOk} source{sourcesOk === 1 ? "" : "s"}
        {duplicates > 0 && `, with ${duplicates} duplicate${duplicates === 1 ? "" : "s"} merged`}.
        {response.total_ranked === 0 && " Try broader wording or turn on more sources."}
      </p>

      {failedSources.length > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-amber-soft px-4 py-3 text-body-sm text-amber">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {failedSources.join(", ")} didn't respond, so {failedSources.length === 1 ? "its" : "their"} papers
          are missing. Search again to retry.
        </p>
      )}

      {response.total_ranked > 0 && (
        // Always one row (like the sources row): scrolls sideways when the chips don't fit.
        // The padding keeps focus rings unclipped.
        <div className="-m-1 mt-5 flex items-center gap-2 overflow-x-auto p-1 max-sm:-mx-4 max-sm:px-4">
          <div role="group" aria-label="Sort results" className="flex shrink-0 rounded-full bg-surface-2 p-0.5">
            {(["score", "newest"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                onClick={() => setParam("sort", key === "score" ? null : key)}
                className={`chip h-6 transition duration-base ${
                  sort === key ? "bg-surface-1 font-semibold text-ink shadow-page" : "text-ink-muted hover:text-ink"
                }`}
              >
                {key === "score" ? "Best match" : "Newest"}
              </button>
            ))}
          </div>

          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-hairline-strong" />

          <FilterChip label="Has PDF" selected={pdfOnly} onClick={() => setParam("pdf", pdfOnly ? null : "1")} />
          {sourceCounts.size > 1 &&
            [...sourceCounts].map(([label, count]) => (
              <FilterChip
                key={label}
                label={`${label} ${count}`}
                selected={sourceFilter === label}
                onClick={() => setParam("source", sourceFilter === label ? null : label)}
              />
            ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {visible.map((paper, i) => (
          <ResultCard
            key={`${paper.paper_name}-${paper.source}-${i}`}
            paper={paper}
            index={i}
            isTop={paper === response.ranked_results[0]}
          />
        ))}
        {response.total_ranked > 0 && visible.length === 0 && (
          <p className="text-body text-ink-subtle">No papers match these filters.</p>
        )}
      </div>
    </section>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`chip transition duration-base ease-spring active:scale-95 ${
        selected ? "bg-accent-soft font-semibold text-accent-ink" : "bg-surface-2 text-ink-muted hover:text-ink"
      }`}
    >
      {selected && <Check size={12} strokeWidth={3} aria-hidden />}
      {label}
    </button>
  );
}
