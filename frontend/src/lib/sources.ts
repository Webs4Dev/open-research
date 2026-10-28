// One colour per source, used everywhere a source appears (DESIGN.md "Category hues").
// Keys are the retriever names from backend/retrievers/manager.py.

interface SourceMeta {
  label: string;
  /** Tailwind classes for a chip: soft background + solid text. */
  chip: string;
  /** Tailwind class for a small solid dot. */
  dot: string;
}

const SOURCES: Record<string, SourceMeta> = {
  arxiv: { label: "arXiv", chip: "bg-violet-soft text-violet", dot: "bg-violet" },
  semantic_scholar: { label: "Semantic Scholar", chip: "bg-sky-soft text-sky", dot: "bg-sky" },
  pubmed: { label: "PubMed", chip: "bg-mint-soft text-mint", dot: "bg-mint" },
  openalex: { label: "OpenAlex", chip: "bg-amber-soft text-amber", dot: "bg-amber" },
  crossref: { label: "Crossref", chip: "bg-pink-soft text-pink", dot: "bg-pink" },
  web: { label: "Web", chip: "bg-coral-soft text-coral", dot: "bg-coral" },
};

const FALLBACK: SourceMeta = { label: "", chip: "bg-surface-2 text-ink-muted", dot: "bg-ink-faint" };

export function sourceMeta(source: string): SourceMeta {
  // Web results are tagged per site type, e.g. "web_blog".
  const key = source === "web" || source.startsWith("web_") ? "web" : source;
  return SOURCES[key] ?? { ...FALLBACK, label: source };
}
