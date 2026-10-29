// Score bands from DESIGN.md: ≥ 80 lime, 60-79 sky, below that neutral.
function band(score: number) {
  if (score >= 80) return { text: "text-accent-ink", bar: "bg-accent" };
  if (score >= 60) return { text: "text-sky", bar: "bg-sky" };
  return { text: "text-ink-subtle", bar: "bg-ink-faint" };
}

/** Total score (0-100): a mono number over a thin meter that springs in. */
export function ScoreMeter({ score }: { score: number }) {
  const { text, bar } = band(score);
  return (
    <div className="flex w-12 shrink-0 flex-col items-end gap-1.5" role="img" aria-label={`Score ${score} out of 100`}>
      <span className={`font-mono text-h3 tabular-nums ${text}`}>{score}</span>
      <MeterBar value={score} max={100} barClass={bar} />
    </div>
  );
}

/** One sub-score row in the expanded card. Colour follows the sub-score's share of its max. */
export function ScoreRow({ label, value, max }: { label: string; value: number; max: number }) {
  const { bar } = band((value / max) * 100);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem_3.5rem] items-center gap-3 text-body-sm max-sm:grid-cols-[minmax(0,1fr)_4.5rem_3.5rem]">
      <span className="text-ink-muted">{label}</span>
      <MeterBar value={value} max={max} barClass={bar} />
      <span className="text-right font-mono text-mono tabular-nums text-ink-muted">
        {value}/{max}
      </span>
    </div>
  );
}

function MeterBar({ value, max, barClass }: { value: number; max: number; barClass: string }) {
  const share = Math.max(0, Math.min(1, value / max));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
      {/* Scaled, not sized: only transform animates (DESIGN.md motion rules). */}
      <div className="h-full origin-left" style={{ transform: `scaleX(${share})` }}>
        <div className={`h-full w-full origin-left animate-fill rounded-full ${barClass}`} />
      </div>
    </div>
  );
}
