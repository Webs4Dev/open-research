import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Sparkles } from "lucide-react";
import { analyzePdf, getPaperAnalysis } from "../../api/endpoints";
import type { RelevantChunk, SavedAnalysis } from "../../api/types";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { ChunkTypeBadge } from "../common/ChunkTypeBadge";
import { ErrorPanel } from "../common/ErrorPanel";
import { Spinner } from "../common/Spinner";
import { ScoreMeter } from "../search/ScoreMeter";
import { getErrorMessage, isCancelled } from "../../lib/errors";
import { useAbortController } from "../../lib/useAbortController";
import { paperAnalysisKey } from "../../lib/queryKeys";
import { DEMO_HINT, useIsDemo } from "../auth/RequireAuth";

interface HighlightsPanelProps {
  paperId: string;
  file: File | null; // null while the PDF is still downloading
  activeChunkId: number | null;
  /** reveal = switch to the PDF on mobile (a user click), not for the automatic first pick. */
  onSelectChunk: (chunk: RelevantChunk, reveal: boolean) => void;
}

export function HighlightsPanel({ paperId, file, activeChunkId, onSelectChunk }: HighlightsPanelProps) {
  const description = useWorkspaceStore((s) => s.projectDescription);
  const setDescription = useWorkspaceStore((s) => s.setProjectDescription);
  const queryClient = useQueryClient();
  const isDemo = useIsDemo();
  // Same key as PaperView, so the saved analysis is fetched once and shared.
  const saved = useQuery({ queryKey: paperAnalysisKey(paperId), queryFn: () => getPaperAnalysis(paperId) });
  const analysis = saved.data ?? null;

  const [editing, setEditing] = useState(false);
  const fieldId = useId();
  const { nextSignal, cancel } = useAbortController();

  const mutation = useMutation({
    mutationFn: (text: string) => analyzePdf(file!, text, nextSignal()),
    onSuccess: (result, text) => {
      // The server saved it; store it locally instead of refetching.
      const fresh: SavedAnalysis = { result, description: text, created_at: new Date().toISOString() };
      queryClient.setQueryData(paperAnalysisKey(paperId), fresh);
      setEditing(false);
      const best = result.relevant_chunks[0];
      if (best) onSelectChunk(best, false);
    },
  });

  // A highlight clicked in the PDF brings its card into view.
  const cardRefs = useRef(new Map<number, HTMLButtonElement>());
  useEffect(() => {
    if (activeChunkId === null) return;
    cardRefs.current.get(activeChunkId)?.scrollIntoView({ block: "nearest" });
  }, [activeChunkId]);

  const chunks = analysis?.result.relevant_chunks ?? [];

  if (saved.isPending) {
    return (
      <p role="status" className="text-body-sm text-ink-subtle">
        Loading saved highlights…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {saved.isError && (
        <ErrorPanel
          message={`Couldn't load saved highlights: ${getErrorMessage(saved.error)}`}
          onRetry={() => saved.refetch()}
        />
      )}
      {editing || !analysis ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(description.trim());
          }}
        >
          <div>
            <label htmlFor={fieldId} className="text-label text-ink">
              Your project
            </label>
            <p className="mt-1 text-body-sm text-ink-subtle">
              Describe what you're building or researching. Every passage in the paper is scored against it.
            </p>
          </div>
          <textarea
            id={fieldId}
            className="textarea min-h-32"
            placeholder="e.g. A long-term memory system for LLM agents that decides what to store and forget"
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="btn"
              title={isDemo ? DEMO_HINT : undefined}
              disabled={!file || mutation.isPending || !description.trim() || saved.isError || isDemo}
            >
              <Sparkles size={16} aria-hidden />
              {analysis ? "Score again" : "Find relevant passages"}
            </button>
            {analysis && (
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3 rounded-md bg-surface-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-label text-ink-subtle">Scored against</p>
            <p className="mt-1 line-clamp-2 text-body-sm text-ink-muted">{analysis.description}</p>
          </div>
          <button
            type="button"
            className="btn-ghost min-h-8 shrink-0 px-3 text-body-sm"
            onClick={() => {
              setDescription(analysis.description);
              setEditing(true);
            }}
          >
            <Pencil size={14} aria-hidden />
            Edit
          </button>
        </div>
      )}

      {mutation.isPending && <Spinner label="Scoring every passage against your project…" onCancel={cancel} />}

      {mutation.isError &&
        (isCancelled(mutation.error) ? (
          <p className="text-body-sm text-ink-subtle">Scoring cancelled.</p>
        ) : (
          <ErrorPanel
            message={`Couldn't score this paper: ${getErrorMessage(mutation.error)}`}
            onRetry={() => mutation.mutate(mutation.variables!)}
          />
        ))}

      {analysis && !mutation.isPending && (
        <section aria-label="Relevant passages" className="flex flex-col gap-3">
          {chunks.length === 0 ? (
            <div>
              <h2 className="font-display text-h3 text-ink">No strong matches</h2>
              <p className="mt-1 text-body text-ink-muted">
                No passage scored 50 or more for this project. Try describing it with the terms the paper uses.
              </p>
            </div>
          ) : (
            <>
              <p className="text-body-sm text-ink-subtle">
                {chunks.length} of {analysis.result.chunk_count} passages scored 50 or more, best first.
              </p>
              <ul className="flex flex-col gap-3">
                {chunks.map((chunk, i) => {
                  const active = chunk.chunk_id === activeChunkId;
                  return (
                    <li key={chunk.chunk_id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) cardRefs.current.set(chunk.chunk_id, el);
                          else cardRefs.current.delete(chunk.chunk_id);
                        }}
                        aria-pressed={active}
                        onClick={() => onSelectChunk(chunk, true)}
                        className={`relative flex w-full items-start gap-4 overflow-hidden rounded-lg border bg-surface-1 p-5 text-left transition-colors duration-fast hover:border-hairline-strong ${
                          active ? "border-hairline-strong" : "border-hairline"
                        }`}
                      >
                        {/* The active card wears the highlighter colour, matching its marks in the PDF. */}
                        {active && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-highlight-bar" />}
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <ChunkTypeBadge type={chunk.chunk_type} />
                            {chunk.page_no && (
                              <span className="chip bg-surface-2 text-ink-muted">
                                Page <span className="font-mono tabular-nums">{chunk.page_no}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-body text-ink">{chunk.reason}</p>
                          <p className="mt-2 text-body-sm text-ink-muted">
                            <span className="font-medium text-ink">How to use it: </span>
                            {chunk.suggested_use}
                          </p>
                        </div>
                        <ScoreMeter score={chunk.relevance_score} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
