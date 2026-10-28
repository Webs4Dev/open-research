import { useNavigate } from "react-router-dom";
import { Search, FileText, Target, MessageCircle, History } from "lucide-react";
import { useActivityStore, type ActivityItem, type ActivityType } from "../store/activityStore";
import { relativeTime } from "../lib/relativeTime";

const ICON_BY_TYPE: Record<ActivityType, typeof Search> = {
  search: Search,
  ingest: FileText,
  analyze: Target,
  ask: MessageCircle,
};

const VERB_BY_TYPE: Record<ActivityType, string> = {
  search: "Searched",
  ingest: "Ingested",
  analyze: "Analysed",
  ask: "Asked",
};

export function Dashboard() {
  const navigate = useNavigate();
  const activityItems = useActivityStore((s) => s.items);

  return (
    <div>
      <p className="mb-1 text-sm text-text-muted">Welcome back</p>
      <h1 className="mb-6 text-2xl font-medium">What are you working on today</h1>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="card cursor-pointer hover:border-border-strong" onClick={() => navigate("/search")}>
          <Search size={20} />
          <p className="mb-1 mt-2 font-medium">Search papers</p>
          <p className="mb-3 text-sm text-text-secondary">
            Find and rank papers against your project.
          </p>
          <button className="btn-secondary">Open search</button>
        </div>

        <div className="card cursor-pointer hover:border-border-strong" onClick={() => navigate("/workspace")}>
          <FileText size={20} />
          <p className="mb-1 mt-2 font-medium">PDF workspace</p>
          <p className="mb-3 text-sm text-text-secondary">
            Upload a paper, then analyse it or ask it questions.
          </p>
          <button className="btn-secondary">Open workspace</button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <History size={16} className="text-text-secondary" />
        <h2 className="text-sm font-medium text-text-secondary">Recent activity</h2>
      </div>

      {activityItems.length === 0 ? (
        <p className="card text-sm text-text-secondary">
          Nothing here yet -- run a search or upload a PDF and it will show up here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {activityItems.map((item) => (
            <ActivityRow key={item.id} item={item} onOpen={() => navigateForActivity(item, navigate)} />
          ))}
        </div>
      )}
    </div>
  );
}

function navigateForActivity(item: ActivityItem, navigate: (path: string) => void) {
  if (item.type === "search") navigate(item.searchId ? `/search?id=${item.searchId}` : "/search");
  else navigate("/workspace");
}

function ActivityRow({ item, onOpen }: { item: ActivityItem; onOpen: () => void }) {
  const Icon = ICON_BY_TYPE[item.type];

  return (
    <div
      className="card flex cursor-pointer items-start gap-3 py-3 hover:border-border-strong"
      onClick={onOpen}
    >
      <div className="mt-0.5 rounded bg-surface-1 p-1.5">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{VERB_BY_TYPE[item.type]}</span>{" "}
          <span className="text-text-secondary">"{item.label}"</span>
        </p>
        {item.detail && <p className="text-xs text-text-secondary">{item.detail}</p>}
      </div>
      <span className="shrink-0 text-xs text-text-muted">{relativeTime(item.timestamp)}</span>
    </div>
  );
}