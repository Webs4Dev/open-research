import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Search, Trash2, Upload } from "lucide-react";
import { deleteSavedSearch, listSavedPapers, listSavedSearches } from "../api/endpoints";
import type { PaperSummary, SearchSummary } from "../api/types";
import { ErrorPanel } from "../components/common/ErrorPanel";
import { getErrorMessage } from "../lib/errors";
import { HISTORY_PAPERS_KEY, HISTORY_SEARCHES_KEY } from "../lib/queryKeys";
import { relativeTime } from "../lib/relativeTime";

// Longer lists collapse behind "Show all" so both panels stay scannable.
const COLLAPSED_ROWS = 8;

export function Dashboard() {
  return (
    <div className="pb-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-h1 text-ink max-sm:text-h1-sm">Your research</h1>
          <p className="mt-2 text-body-lg text-ink-muted">
            Every search and paper is saved to your account, so you can pick up where you left off.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/search" className="btn">
            <Search size={16} aria-hidden />
            New search
          </Link>
          <Link to="/workspace" className="btn-secondary">
            <Upload size={16} aria-hidden />
            Upload a paper
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SearchesPanel />
        <PapersPanel />
      </div>
    </div>
  );
}

function SearchesPanel() {
  const queryClient = useQueryClient();
  const searches = useQuery({ queryKey: HISTORY_SEARCHES_KEY, queryFn: listSavedSearches });
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const remove = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: (_, id) => {
      queryClient.setQueryData<SearchSummary[]>(HISTORY_SEARCHES_KEY, (old) => old?.filter((s) => s.id !== id));
      queryClient.removeQueries({ queryKey: ["search", id] }); // its cached results
      queryClient.invalidateQueries({ queryKey: HISTORY_SEARCHES_KEY }); // the server caps the list at 100
      setConfirmingId(null);
    },
  });

  return (
    <Panel title="Searches" count={searches.data?.length}>
      {remove.isError && (
        <div className="px-6 pb-3">
          <ErrorPanel message={`Couldn't delete that search: ${getErrorMessage(remove.error)}`} />
        </div>
      )}
      <PanelBody
        query={searches}
        errorLabel="Couldn't load your searches"
        empty={
          <EmptyState
            text="No searches yet. Each search you run is saved here with its ranked results."
            action={
              <Link to="/search" className="btn-secondary">
                Run your first search
              </Link>
            }
          />
        }
        renderRow={(search: SearchSummary) => (
          <li key={search.id} className="group flex items-center gap-2 pr-3">
            <Link
              to={`/search?id=${search.id}`}
              className="min-w-0 flex-1 rounded-md px-6 py-3 transition-colors duration-fast hover:bg-surface-2"
            >
              <p className="truncate text-body font-medium text-ink">{search.query}</p>
              <p className="text-body-sm text-ink-subtle">
                {search.result_count} paper{search.result_count === 1 ? "" : "s"} ranked,{" "}
                {relativeTime(Date.parse(search.created_at))}
              </p>
            </Link>
            {confirmingId === search.id ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="btn-ghost min-h-8 bg-red-soft px-3 text-body-sm text-red hover:bg-red-soft hover:text-red"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(search.id)}
                >
                  {remove.isPending ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  className="btn-ghost min-h-8 px-3 text-body-sm"
                  onClick={() => setConfirmingId(null)}
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`Delete search "${search.query}"`}
                className="btn-ghost w-10 shrink-0 px-0 text-ink-subtle opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
                disabled={remove.isPending} // one delete at a time
                onClick={() => {
                  remove.reset();
                  setConfirmingId(search.id);
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        )}
      />
    </Panel>
  );
}

/** Also shown on the Workspace page, where the upload link in the empty state would point at itself. */
export function PapersPanel({ uploadLink = true }: { uploadLink?: boolean }) {
  const papers = useQuery({ queryKey: HISTORY_PAPERS_KEY, queryFn: listSavedPapers });

  return (
    <Panel title="Papers" count={papers.data?.length}>
      <PanelBody
        query={papers}
        errorLabel="Couldn't load your papers"
        empty={
          <EmptyState
            text="No papers yet. Upload a PDF to ask it questions, and the conversation stays here for later."
            action={
              uploadLink && (
                <Link to="/workspace" className="btn-secondary">
                  Upload a paper
                </Link>
              )
            }
          />
        }
        renderRow={(paper: PaperSummary) => (
          <li key={paper.paper_id} className="pr-3">
            <Link
              to={`/workspace/${paper.paper_id}`}
              className="flex items-center gap-3 rounded-md px-6 py-3 transition-colors duration-fast hover:bg-surface-2"
            >
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-2 text-ink-muted">
                <FileText size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body font-medium text-ink">{paper.filename}</span>
                <span className="block text-body-sm text-ink-subtle">
                  Uploaded {relativeTime(Date.parse(paper.created_at))}
                </span>
              </span>
            </Link>
          </li>
        )}
      />
    </Panel>
  );
}

function Panel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="card px-0 pb-3 pt-5">
      <div className="mb-2 flex items-center gap-2 px-6">
        <h2 id={headingId} className="font-display text-h3 text-ink">
          {title}
        </h2>
        {!!count && <span className="chip h-6 bg-surface-2 px-2 font-mono tabular-nums text-ink-muted">{count}</span>}
      </div>
      {children}
    </section>
  );
}

interface PanelBodyProps<T> {
  query: { data?: T[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  errorLabel: string;
  empty: React.ReactNode;
  renderRow: (item: T) => React.ReactNode;
}

/** Loading skeleton, error with retry, empty state, or the list (collapsed past COLLAPSED_ROWS). */
function PanelBody<T>({ query, errorLabel, empty, renderRow }: PanelBodyProps<T>) {
  const [showAll, setShowAll] = useState(false);

  if (query.isLoading) {
    return (
      <ul role="status" aria-label="Loading" aria-busy="true" className="flex flex-col gap-4 px-6 py-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex animate-pulse flex-col gap-2">
            <span className="h-4 w-3/4 rounded-sm bg-surface-2" />
            <span className="h-3 w-1/3 rounded-sm bg-surface-2" />
          </li>
        ))}
      </ul>
    );
  }
  if (query.isError) {
    return (
      <div className="px-6 py-3">
        <ErrorPanel message={`${errorLabel}: ${getErrorMessage(query.error)}`} onRetry={() => query.refetch()} />
      </div>
    );
  }

  const items = query.data ?? [];
  if (items.length === 0) return <>{empty}</>;

  const visible = showAll ? items : items.slice(0, COLLAPSED_ROWS);
  return (
    <>
      <ul className="flex flex-col">{visible.map(renderRow)}</ul>
      {items.length > COLLAPSED_ROWS && (
        <button type="button" className="btn-ghost mx-3 mt-1 text-body-sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </>
  );
}

function EmptyState({ text, action }: { text: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 px-6 py-3">
      <p className="max-w-[48ch] text-body text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
