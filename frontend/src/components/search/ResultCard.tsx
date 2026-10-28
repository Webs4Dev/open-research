import { useId, useState } from "react";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import type { RankingResult, Scores } from "../../api/types";
import { sourceMeta } from "../../lib/sources";
import { ScoreMeter, ScoreRow } from "./ScoreMeter";

// Max points per sub-score: the bounds in backend/schemas/ranking.py (they sum to 100).
const SCORE_PARTS: { key: keyof Scores; label: string; max: number }[] = [
  { key: "topic_match", label: "Topic match", max: 25 },
  { key: "project_relevance", label: "Fit with your project", max: 25 },
  { key: "research_similarity", label: "Similar research", max: 15 },
  { key: "pdf_availability", label: "Full text available", max: 15 },
  { key: "recency", label: "Recency", max: 10 },
  { key: "potential_value", label: "Potential value", max: 10 },
];

// Retrievers use the placeholder "Not Available" when a paper has no link.
function isRealUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

interface Props {
  paper: RankingResult;
  /** The best match gets a lime-ink border, nothing louder. */
  isTop: boolean;
  /** Position in the list, for the enter stagger. */
  index: number;
}

export function ResultCard({ paper, isTop, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const source = sourceMeta(paper.source);
  const url = isRealUrl(paper.paper_url) ? paper.paper_url : null;
  const hasPdf = paper.pdf_status === "available";

  return (
    <article
      className={`card animate-rise ${isTop ? "border-accent-ink" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className={`chip ${source.chip}`}>{source.label}</span>
            {!!paper.published_year && (
              <span className="chip bg-surface-2 font-mono tabular-nums text-ink-muted">
                {paper.published_year}
              </span>
            )}
            {hasPdf && (
              <span className="chip bg-surface-2 text-ink-muted">
                <FileText size={12} aria-hidden />
                PDF
              </span>
            )}
            {isTop && <span className="chip bg-accent-soft text-accent-ink">Top pick</span>}
          </div>

          <h3 className="font-display text-h3 text-ink">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm decoration-accent-ink decoration-2 underline-offset-4 hover:underline"
              >
                {paper.paper_name}
              </a>
            ) : (
              paper.paper_name
            )}
          </h3>

          {paper.why_it_matches.length > 0 && (
            <p className="mt-2 line-clamp-2 max-w-[68ch] text-body text-ink-muted">
              {paper.why_it_matches[0]}
            </p>
          )}
        </div>

        <ScoreMeter score={paper.total_score} />
      </div>

      <button
        type="button"
        className="btn-ghost -mx-3 mt-3 min-h-9 px-3 text-body-sm"
        aria-expanded={expanded}
        aria-controls={expanded ? detailsId : undefined}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide details" : "Score breakdown and ideas"}
        <ChevronDown
          size={16}
          aria-hidden
          className={`transition-transform duration-base ease-spring ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div id={detailsId} className="mt-3 grid animate-rise gap-6 border-t border-hairline pt-5 lg:grid-cols-2">
          <section>
            <h4 className="mb-3 text-label text-ink-subtle">How it scored</h4>
            <div className="flex flex-col gap-2.5">
              {SCORE_PARTS.map((part) => (
                <ScoreRow key={part.key} label={part.label} value={paper.scores[part.key]} max={part.max} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-5">
            {paper.why_it_matches.length > 1 && (
              <DetailList title="More reasons it matches" items={paper.why_it_matches.slice(1)} />
            )}
            {paper.useful_ideas.length > 0 && <DetailList title="Ideas you could use" items={paper.useful_ideas} />}
            {paper.pdf_usefulness && (
              <div>
                <h4 className="mb-1.5 text-label text-ink-subtle">Worth reading in full?</h4>
                <p className="text-body-sm text-ink-muted">{paper.pdf_usefulness}</p>
              </div>
            )}
            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="btn-secondary self-start">
                {hasPdf ? "Open PDF" : "Open paper page"}
                <ExternalLink size={14} aria-hidden />
              </a>
            )}
          </section>
        </div>
      )}
    </article>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-1.5 text-label text-ink-subtle">{title}</h4>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-body-sm text-ink-muted marker:text-ink-faint">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
