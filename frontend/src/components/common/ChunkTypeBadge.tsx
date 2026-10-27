const TONE_BY_TYPE: Record<string, string> = {
  // Keys must match chunk_type values in prompts/project_relevance_prompt.py
  methodology: "bg-chip-amber text-chip-amber-text",
  results: "bg-chip-teal text-chip-teal-text",
  background: "bg-surface-1 text-text-secondary",
};

const FALLBACK_TONE = "bg-surface-1 text-text-secondary";

export function ChunkTypeBadge({ type }: { type: string }) {
  const tone = TONE_BY_TYPE[type.toLowerCase()] ?? FALLBACK_TONE;
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${tone}`}>{type}</span>
  );
}

/**
 * Single, deliberately loud highlight color for every chunk in the PDF —
 * the pastel per-type tints were too faint to notice. Which chunk is which
 * is now conveyed by the numbered badge (see PdfChunkViewer), not color.
 */
export const HIGHLIGHT_YELLOW = "rgba(255, 224, 0, 0.35)";
export const HIGHLIGHT_YELLOW_ACTIVE = "rgba(255, 200, 0, 0.70)";
