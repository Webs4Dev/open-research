import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RelevantChunk } from "../../api/types";
import { HIGHLIGHT_YELLOW, HIGHLIGHT_YELLOW_ACTIVE_OUTLINE } from "../common/ChunkTypeBadge";
import "react-pdf/dist/Page/TextLayer.css";

interface PdfChunkViewerProps {
  file: File;
  chunks: RelevantChunk[];
  activeChunkId: number | null;
  onChunkClick: (chunkId: number) => void;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function PdfChunkViewer({
  file,
  chunks,
  activeChunkId,
  onChunkClick,
}: PdfChunkViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(chunks[0]?.page_no ?? 1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(420);

  // Keep the rendered PDF width in sync with the actual container size, so
  // react-pdf renders its canvas at the real display resolution instead of
  // being CSS-stretched (which is what causes blurry text/highlights).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(Math.floor(width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Jump to whichever page the active chunk lives on.
  useEffect(() => {
    const active = chunks.find((c) => c.chunk_id === activeChunkId);
    if (active?.page_no) setPageNumber(active.page_no);
  }, [activeChunkId, chunks]);

  const pageChunks = useMemo(
    () => chunks.filter((c) => c.page_no === pageNumber && c.chunk_text),
    [chunks, pageNumber]
  );

  // react-pdf calls this per text-layer span. We wrap a span's text in <mark>
  // if it is a substring of one of this page's relevant chunk texts -- a
  // heuristic that works well since chunk_text is the concatenation of many
  // such spans. This is a stand-in for real bounding-box highlighting; see
  // the README note about adding bounding boxes server-side for pixel-exact
  // highlights instead of text-containment matching.
  //
  // Memoized so react-pdf doesn't see a new function identity on every
  // parent render and needlessly re-run/repaint the whole text layer.
  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      const trimmed = str.trim();
      if (trimmed.length < 4) return escapeHtml(str);

      const match = pageChunks.find((c) => c.chunk_text?.includes(trimmed));
      if (!match) return escapeHtml(str);

      const isActive = match.chunk_id === activeChunkId;
      const outline = isActive
        ? `outline:2px solid ${HIGHLIGHT_YELLOW_ACTIVE_OUTLINE};outline-offset:1px;`
        : "";
      // color:transparent keeps the text layer invisible: <mark> defaults to black
      // text, which drew every highlighted line a second time over the canvas (blurry).
      // (The highlighter-style blend lives on the text layer in index.css.)
      return `<mark data-chunk-id="${match.chunk_id}" style="background:${HIGHLIGHT_YELLOW};color:transparent;border-radius:2px;${outline}">${escapeHtml(
        str
      )}</mark>`;
    },
    [pageChunks, activeChunkId]
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <button
          className="btn-secondary px-2 py-1 text-xs"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-text-secondary">
          Page {pageNumber} of {numPages ?? "..."}
        </span>
        <button
          className="btn-secondary px-2 py-1 text-xs"
          disabled={!numPages || pageNumber >= numPages}
          onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p))}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-auto rounded-lg border border-border bg-surface-2"
        onClick={(e) => {
          const target = (e.target as HTMLElement).closest("mark[data-chunk-id]");
          const id = target?.getAttribute("data-chunk-id");
          if (id) onChunkClick(Number(id));
        }}
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<p className="p-6 text-sm text-text-secondary">Loading PDF...</p>}
          error={<p className="p-6 text-sm text-red-600">Could not load this PDF.</p>}
        >
          <Page
            pageNumber={pageNumber}
            width={containerWidth || 420}
            customTextRenderer={customTextRenderer}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
}