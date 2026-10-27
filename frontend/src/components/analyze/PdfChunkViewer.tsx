import { useMemo, useState, useEffect, useRef } from "react";
import { Document, Page } from "react-pdf";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RelevantChunk } from "../../api/types";
import { HIGHLIGHT_YELLOW, HIGHLIGHT_YELLOW_ACTIVE } from "../common/ChunkTypeBadge";
import "react-pdf/dist/Page/TextLayer.css";

interface PdfChunkViewerProps {
  file: File;
  chunks: RelevantChunk[];
  activeChunkId: number | null;
  onChunkClick: (chunkId: number) => void;
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

  // The server sends one box per text line (fractions of the page size), so
  // highlights are drawn as overlays at exact positions instead of guessing
  // which text-layer spans belong to a chunk.
  const pageBoxes = useMemo(
    () =>
      chunks.flatMap((c) =>
        c.boxes
          .filter((b) => b.page_no === pageNumber)
          .map((b) => ({ ...b, chunkId: c.chunk_id }))
      )
        // Draw the active chunk last so neighbouring boxes never paint over it.
        .sort((a, b) => Number(a.chunkId === activeChunkId) - Number(b.chunkId === activeChunkId)),
    [chunks, pageNumber, activeChunkId]
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
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<p className="p-6 text-sm text-text-secondary">Loading PDF...</p>}
          error={<p className="p-6 text-sm text-red-600">Could not load this PDF.</p>}
        >
          {/* inline-block: the wrapper (and so the overlay) is exactly the page's size. */}
          <div className="relative inline-block align-top">
            <Page
              pageNumber={pageNumber}
              width={containerWidth || 420}
              renderAnnotationLayer={false}
            />
            {/* Above the text layer (z-index 2); multiply keeps the text under the yellow black. */}
            <div className="pointer-events-none absolute inset-0 z-10">
              {pageBoxes.map((b, i) => (
                <div
                  key={`${b.chunkId}-${i}`}
                  className="pointer-events-auto absolute cursor-pointer mix-blend-multiply"
                  style={{
                    left: `${b.x0 * 100}%`,
                    top: `${b.y0 * 100}%`,
                    width: `${(b.x1 - b.x0) * 100}%`,
                    height: `${(b.y1 - b.y0) * 100}%`,
                    background: b.chunkId === activeChunkId ? HIGHLIGHT_YELLOW_ACTIVE : HIGHLIGHT_YELLOW,
                  }}
                  onClick={() => onChunkClick(b.chunkId)}
                />
              ))}
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
}