// Category hues from DESIGN.md. Keys must match chunk_type values in prompts/project_relevance_prompt.py
const TONE_BY_TYPE: Record<string, string> = {
  methodology: "bg-amber-soft text-amber",
  results: "bg-mint-soft text-mint",
  background: "bg-violet-soft text-violet",
};

const FALLBACK_TONE = "bg-surface-2 text-ink-muted";

export function ChunkTypeBadge({ type }: { type: string }) {
  const tone = TONE_BY_TYPE[type.toLowerCase()] ?? FALLBACK_TONE;
  return <span className={`chip ${tone}`}>{type}</span>;
}
