import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getPaperFile, listSavedPapers } from "../api/endpoints";
import type { RelevantChunk } from "../api/types";
import { PdfViewer, type ViewerJump } from "../components/workspace/PdfViewer";
import { HighlightsPanel } from "../components/workspace/HighlightsPanel";
import { AskChat } from "../components/workspace/AskChat";
import { ErrorPanel } from "../components/common/ErrorPanel";
import { useWorkspaceStore } from "../store/workspaceStore";
import { getErrorMessage } from "../lib/errors";
import { HISTORY_PAPERS_KEY, paperFileKey } from "../lib/queryKeys";

type PanelTab = "highlights" | "ask";
type MobileTab = "paper" | PanelTab;

// The PDF pane's share of the width, in percent (DESIGN.md: default 60%).
const SPLIT_DEFAULT = 60;
const SPLIT_MIN = 35;
const SPLIT_MAX = 75;
const clampSplit = (value: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));

/** One paper: the PDF on the left, Highlights and Ask on the right. Below 1024px, tabs switch between the three. */
export function PaperView() {
  const { paperId = "" } = useParams();
  // Keyed, so opening another paper starts from fresh state instead of reusing this paper's.
  return <PaperPage key={paperId} paperId={paperId} />;
}

function PaperPage({ paperId }: { paperId: string }) {
  const validId = /^[0-9a-f]{16}$/.test(paperId);

  const papers = useQuery({ queryKey: HISTORY_PAPERS_KEY, queryFn: listSavedPapers });
  const filename = papers.data?.find((p) => p.paper_id === paperId)?.filename ?? "";

  const pdf = useQuery({
    queryKey: paperFileKey(paperId),
    queryFn: ({ signal }) => getPaperFile(paperId, signal),
    enabled: validId,
    staleTime: Infinity, // a paper's bytes never change (its id is their hash)
    retry: false, // a 404 won't succeed on retry
  });
  // Analyze takes a file upload, so wrap the downloaded bytes back into a File.
  const file = useMemo(
    () => (pdf.data ? new File([pdf.data], filename || "paper.pdf", { type: "application/pdf" }) : null),
    [pdf.data, filename]
  );

  const chunks = useWorkspaceStore((s) => s.analyses[paperId]?.result.relevant_chunks) ?? [];
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);
  const [jump, setJump] = useState<ViewerJump | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>("highlights");
  const [showPaperOnMobile, setShowPaperOnMobile] = useState(true);

  const jumpTo = (page: number, y?: number, reveal = true) => {
    setJump((prev) => ({ page, y, seq: (prev?.seq ?? 0) + 1 }));
    if (reveal) setShowPaperOnMobile(true);
  };

  const selectChunk = (chunk: RelevantChunk, reveal: boolean) => {
    setActiveChunkId(chunk.chunk_id);
    const first = chunk.boxes[0];
    const page = first?.page_no ?? chunk.page_no;
    if (page) jumpTo(page, first?.y0, reveal);
  };

  const mobileTab: MobileTab = showPaperOnMobile ? "paper" : panelTab;
  const selectMobileTab = (tab: MobileTab) => {
    setShowPaperOnMobile(tab === "paper");
    if (tab !== "paper") setPanelTab(tab);
  };

  // Drag (or arrow keys on) the divider to resize the split.
  const [split, setSplit] = useState(SPLIT_DEFAULT);
  const splitRef = useRef<HTMLDivElement>(null);
  const resizeTo = (clientX: number) => {
    const box = splitRef.current?.getBoundingClientRect();
    if (box) setSplit(clampSplit(((clientX - box.left) / box.width) * 100));
  };

  if (!validId) {
    return (
      <div className="p-10 max-sm:p-4">
        <ErrorPanel message="That isn't a valid paper link." />
        <Link to="/workspace" className="btn-secondary mt-4">
          Go to the workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-hairline bg-surface-1 px-6 py-3 max-sm:px-4">
        <Link to="/workspace" aria-label="Back to the workspace" className="btn-ghost w-10 shrink-0 px-0">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="min-w-0 truncate font-display text-h3 text-ink">{filename || "Paper"}</h1>
      </header>

      <div className="shrink-0 border-b border-hairline bg-surface-1 px-4 lg:hidden">
        <TabBar
          label="Paper view"
          tabs={[
            ["paper", "Paper"],
            ["highlights", "Highlights"],
            ["ask", "Ask"],
          ]}
          value={mobileTab}
          onChange={selectMobileTab}
        />
      </div>

      <div ref={splitRef} className="flex min-h-0 flex-1">
        <section
          aria-label="PDF"
          className={`min-w-0 max-lg:flex-1 lg:basis-[var(--split)] ${showPaperOnMobile ? "" : "max-lg:hidden"}`}
          style={{ "--split": `${split}%` } as React.CSSProperties}
        >
          {pdf.isError ? (
            <div className="flex h-full flex-col items-start gap-4 bg-surface-3 p-10 max-sm:p-4">
              <ErrorPanel message={`Couldn't open this paper: ${getErrorMessage(pdf.error)}`} onRetry={() => pdf.refetch()} />
              <Link to="/workspace" className="btn-secondary">
                Upload it again
              </Link>
            </div>
          ) : pdf.data ? (
            <PdfViewer
              file={pdf.data}
              chunks={chunks}
              activeChunkId={activeChunkId}
              onChunkClick={(id) => {
                setActiveChunkId(id);
                setPanelTab("highlights");
              }}
              jump={jump}
            />
          ) : (
            <div role="status" className="grid h-full place-items-center bg-surface-3 text-body-sm text-ink-subtle">
              Loading PDF…
            </div>
          )}
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the PDF and the side panel"
          aria-valuenow={Math.round(split)}
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          tabIndex={0}
          className="group relative w-2 shrink-0 cursor-col-resize touch-none bg-surface-3 max-lg:hidden"
          onPointerDown={(e) => {
            e.preventDefault(); // no text selection while dragging
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && resizeTo(e.clientX)}
          onKeyDown={(e) => {
            const step = { ArrowLeft: -5, ArrowRight: 5 }[e.key];
            if (step) setSplit((s) => clampSplit(s + step));
            else if (e.key === "Home") setSplit(SPLIT_MIN);
            else if (e.key === "End") setSplit(SPLIT_MAX);
            else return;
            e.preventDefault();
          }}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-hairline-strong transition-colors duration-fast group-hover:bg-ink-faint"
          />
        </div>

        <aside
          aria-label="Highlights and questions"
          className={`flex min-w-0 flex-1 flex-col bg-surface-1 lg:min-w-80 ${showPaperOnMobile ? "max-lg:hidden" : ""}`}
        >
          <div className="shrink-0 border-b border-hairline px-6 max-lg:hidden">
            <TabBar
              label="Side panel"
              tabs={[
                ["highlights", "Highlights"],
                ["ask", "Ask"],
              ]}
              value={panelTab}
              onChange={setPanelTab}
            />
          </div>
          {/* Both stay mounted, so a running analysis or question survives a tab switch. */}
          <div className={`min-h-0 flex-1 overflow-y-auto p-6 max-sm:p-4 ${panelTab === "highlights" ? "" : "hidden"}`}>
            <HighlightsPanel paperId={paperId} file={file} activeChunkId={activeChunkId} onSelectChunk={selectChunk} />
          </div>
          <div className={`min-h-0 flex-1 flex-col ${panelTab === "ask" ? "flex" : "hidden"}`}>
            <AskChat paperId={paperId} onJumpToPage={(page) => jumpTo(page)} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Underline tabs (DESIGN.md): accent-ink underline and ink text on the active tab. */
function TabBar<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: [T, string][];
  value: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6">
      {tabs.map(([id, text]) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`relative min-h-12 text-body font-medium transition-colors duration-base ${
              active ? "text-ink" : "text-ink-subtle hover:text-ink"
            }`}
          >
            {text}
            {active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent-ink" />}
          </button>
        );
      })}
    </div>
  );
}
