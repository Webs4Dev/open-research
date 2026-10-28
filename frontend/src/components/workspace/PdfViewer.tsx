import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronDown, ChevronUp, MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import type { HighlightBox, RelevantChunk } from "../../api/types";
import "react-pdf/dist/Page/TextLayer.css";

/** A request to scroll the viewer. `seq` changes on every request, so the same target can be jumped to twice. */
export interface ViewerJump {
  page: number;
  y?: number; // 0-1 fraction of the page height
  seq: number;
}

interface PdfViewerProps {
  file: Blob;
  chunks: RelevantChunk[];
  activeChunkId: number | null;
  onChunkClick: (chunkId: number) => void;
  jump: ViewerJump | null;
}

// Zoom is relative to fit-width (1 = the page fills the pane's width).
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
// Room above a jump target so it isn't hidden under the floating toolbar.
const TOOLBAR_CLEARANCE = 80;

type PageBox = HighlightBox & { chunkId: number };

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PdfViewer({ file, chunks, activeChunkId, onChunkClick, jump }: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [ratios, setRatios] = useState<number[] | null>(null); // height / width of each page
  const [measureFailed, setMeasureFailed] = useState(false);
  const [fitWidth, setFitWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [nearPages, setNearPages] = useState<Set<number>>(() => new Set());

  const scrollShare = useRef<number | null>(null); // reading position to restore after a resize
  const pendingJump = useRef<ViewerJump | null>(null);

  const pageWidth = Math.round(fitWidth * zoom);
  const ready = ratios !== null && fitWidth > 0; // hidden panes (mobile tabs) measure 0 wide

  // Render at the pane's real width so react-pdf draws the canvas at display resolution
  // (a CSS-stretched canvas is what made text look blurry). Debounced so dragging the
  // split doesn't redraw every page on every pixel.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timer: number | undefined;
    const observer = new ResizeObserver(([entry]) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (el.scrollHeight > 0) scrollShare.current = el.scrollTop / el.scrollHeight;
        setFitWidth(Math.floor(entry.contentRect.width));
      }, 100);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // Keep the same spot in view when every page changes size (zoom or resize).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && scrollShare.current !== null) el.scrollTop = scrollShare.current * el.scrollHeight;
    scrollShare.current = null;
  }, [pageWidth]);

  const scrollToPage = (page: number, y = 0, smooth = true) => {
    const el = scrollRef.current;
    const pageEl = pageRefs.current[page - 1];
    if (!el || !pageEl) return;
    const offset = pageEl.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    el.scrollTo({
      top: Math.max(0, offset + y * pageEl.offsetHeight - TOOLBAR_CLEARANCE),
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
    });
  };

  // A jump waits until the pages have a size (the PDF may still be loading, or the pane hidden).
  useEffect(() => {
    if (jump) pendingJump.current = jump;
  }, [jump]);
  // Hiding the pane (mobile tabs) unmounts the pages and resets the scroll, so when it
  // comes back without a jump to make, return to the page the reader was on.
  const wasReady = useRef(false);
  useEffect(() => {
    if (!ready) {
      wasReady.current = false;
      return;
    }
    const target = pendingJump.current;
    if (target) {
      pendingJump.current = null;
      scrollToPage(target.page, target.y);
    } else if (!wasReady.current && currentPage > 1) {
      scrollToPage(currentPage, 0, false);
    }
    wasReady.current = true;
  }, [jump, ready, pageWidth]);

  // Only pages within a screen of the viewport get a canvas; the rest are sized placeholders.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !ready) return;
    const observer = new IntersectionObserver(
      (entries) =>
        setNearPages((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const page = Number((entry.target as HTMLElement).dataset.page);
            if (entry.isIntersecting) next.add(page);
            else next.delete(page);
          }
          return next;
        }),
      { root, rootMargin: "100% 0px" }
    );
    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [ready]);

  // The current page is the one taking up the most of the pane.
  const frame = useRef(0);
  const handleScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      // No pages mounted (the pane is hidden): keep the last page for when it comes back.
      if (!el || !pageRefs.current.some(Boolean)) return;
      const pane = el.getBoundingClientRect();
      let best = { page: 1, visible: 0 };
      pageRefs.current.forEach((pageEl, i) => {
        if (!pageEl) return;
        const rect = pageEl.getBoundingClientRect();
        const visible = Math.min(rect.bottom, pane.bottom) - Math.max(rect.top, pane.top);
        if (visible > best.visible) best = { page: i + 1, visible };
      });
      setCurrentPage(best.page);
    });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const handleLoad = (pdf: PDFDocumentProxy) => {
    const pages = Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then((page) => {
        const { width, height } = page.getViewport({ scale: 1 });
        return height / width;
      })
    );
    Promise.all(pages)
      .then(setRatios)
      .catch(() => setMeasureFailed(true));
  };

  // The server sends one box per text line (fractions of the page), drawn as overlays.
  const boxesByPage = useMemo(() => {
    const byPage = new Map<number, PageBox[]>();
    for (const chunk of chunks) {
      for (const box of chunk.boxes) {
        const list = byPage.get(box.page_no) ?? [];
        list.push({ ...box, chunkId: chunk.chunk_id });
        byPage.set(box.page_no, list);
      }
    }
    // Draw the active chunk last so neighbouring boxes never paint over it.
    for (const list of byPage.values()) {
      list.sort((a, b) => Number(a.chunkId === activeChunkId) - Number(b.chunkId === activeChunkId));
    }
    return byPage;
  }, [chunks, activeChunkId]);

  const changeZoom = (next: number) => {
    const el = scrollRef.current;
    if (el && el.scrollHeight > 0) scrollShare.current = el.scrollTop / el.scrollHeight;
    setZoom(next);
  };
  const zoomIndex = ZOOM_STEPS.indexOf(zoom);
  const numPages = ratios?.length ?? null;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-surface-3">
      {/* Floating toolbar pill. No lime anywhere in the PDF pane (DESIGN.md). */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
        <div
          role="toolbar"
          aria-label="PDF controls"
          className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-hairline bg-surface-1 p-1 shadow-overlay"
        >
          <ToolButton label="Previous page" disabled={currentPage <= 1} onClick={() => scrollToPage(currentPage - 1)}>
            <ChevronUp size={18} />
          </ToolButton>
          <span className="min-w-16 px-1 text-center font-mono text-mono tabular-nums text-ink-muted">
            <span className="sr-only">Page </span>
            {currentPage} / {numPages ?? "–"}
          </span>
          <ToolButton
            label="Next page"
            disabled={!numPages || currentPage >= numPages}
            onClick={() => scrollToPage(currentPage + 1)}
          >
            <ChevronDown size={18} />
          </ToolButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-hairline-strong" />
          <ToolButton label="Zoom out" disabled={zoomIndex <= 0} onClick={() => changeZoom(ZOOM_STEPS[zoomIndex - 1])}>
            <ZoomOut size={18} />
          </ToolButton>
          <span className="w-12 text-center font-mono text-mono tabular-nums text-ink-muted" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton
            label="Zoom in"
            disabled={zoomIndex >= ZOOM_STEPS.length - 1}
            onClick={() => changeZoom(ZOOM_STEPS[zoomIndex + 1])}
          >
            <ZoomIn size={18} />
          </ToolButton>
          <ToolButton label="Fit width" disabled={zoom === 1} onClick={() => changeZoom(1)}>
            <MoveHorizontal size={18} />
          </ToolButton>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto px-6 pb-6 pt-20 [scrollbar-gutter:stable] max-sm:px-3">
        <Document
          file={file}
          onLoadSuccess={handleLoad}
          loading={<p className="py-10 text-center text-body-sm text-ink-subtle">Loading PDF…</p>}
          error={<p className="py-10 text-center text-body-sm text-red">Could not display this PDF.</p>}
        >
          {measureFailed && <p className="py-10 text-center text-body-sm text-red">Could not display this PDF.</p>}
          {ready && (
            <div className="mx-auto flex w-max flex-col gap-6">
              {ratios.map((ratio, i) => {
                const pageNumber = i + 1;
                const near = nearPages.has(pageNumber);
                return (
                  <div
                    key={pageNumber}
                    ref={(el) => {
                      pageRefs.current[i] = el;
                    }}
                    data-page={pageNumber}
                    className="relative overflow-hidden bg-surface-1 shadow-page"
                    style={{ width: pageWidth, height: Math.round(pageWidth * ratio) }}
                  >
                    {near && (
                      <>
                        <Page pageNumber={pageNumber} width={pageWidth} renderAnnotationLayer={false} loading="" />
                        {/* Above the text layer (z-index 2); multiply keeps the text under the yellow black. */}
                        {/* Mouse shortcut only: the Highlights cards are the keyboard and screen reader path. */}
                        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
                          {(boxesByPage.get(pageNumber) ?? []).map((b, j) => (
                            <div
                              key={`${b.chunkId}-${j}`}
                              className={`pointer-events-auto absolute cursor-pointer mix-blend-multiply ${
                                b.chunkId === activeChunkId ? "bg-highlight-active" : "bg-highlight"
                              }`}
                              style={{
                                left: `${b.x0 * 100}%`,
                                top: `${b.y0 * 100}%`,
                                width: `${(b.x1 - b.x0) * 100}%`,
                                height: `${(b.y1 - b.y0) * 100}%`,
                              }}
                              onClick={() => onChunkClick(b.chunkId)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Document>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="btn-ghost w-10 rounded-full px-0 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
