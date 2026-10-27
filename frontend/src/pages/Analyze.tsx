import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Edit3, ArrowLeft } from "lucide-react";
import { analyzePdf } from "../api/endpoints";
import { useWorkspaceStore } from "../store/workspaceStore";
import { PdfChunkViewer } from "../components/analyze/PdfChunkViewer";
import { ChunkTypeBadge } from "../components/common/ChunkTypeBadge";
import { Spinner } from "../components/common/Spinner";
import type { RelevantChunk } from "../api/types";
import { useActivityStore } from "../store/activityStore";
import { getErrorMessage } from "../lib/errors";

export function Analyze() {
  const navigate = useNavigate();
  const file = useWorkspaceStore((s) => s.file);
  const analysisResult = useWorkspaceStore((s) => s.analysisResult);
  const setAnalysisResult = useWorkspaceStore((s) => s.setAnalysisResult);

  const [projectDescription, setProjectDescription] = useState("");
  const [showDescBox, setShowDescBox] = useState(true);
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);

  const logActivity = useActivityStore((s) => s.logActivity);

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return analyzePdf(file, projectDescription);
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      setShowDescBox(false);
      setActiveChunkId(result.relevant_chunks[0]?.chunk_id ?? null);
      logActivity({
        type: "analyze",
        label: result.filename,
        detail: `${result.relevant_chunks.length} relevant chunks`,
      });
    },
  });

  if (!file) {
    return (
      <div>
        <p className="mb-3 text-sm text-text-secondary">
          Upload a PDF in the workspace first, then come back here to analyse it.
        </p>
        <button className="btn-secondary" onClick={() => navigate("/workspace")}>
          <ArrowLeft size={14} />
          Go to PDF workspace
        </button>
      </div>
    );
  }

  const chunks: RelevantChunk[] = analysisResult?.relevant_chunks ?? [];

  // Still used for the numbered circle badges in the side list below;
  // the PDF viewer itself no longer needs it since the active-chunk
  // outline is enough to show which highlight corresponds to which card.
  const chunkNumbers: Record<number, number> = {};
  chunks.forEach((chunk, i) => {
    chunkNumbers[chunk.chunk_id] = i + 1;
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-medium">Analyze against your project</h1>
        <div className="flex gap-2">
          <button className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => setShowDescBox((v) => !v)}>
            <Edit3 size={13} />
            Edit description
          </button>
          <button className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={13} />
            Back
          </button>
        </div>
      </div>

      {showDescBox && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs text-text-secondary">Project description</p>
          <textarea
            className="textarea h-20"
            placeholder="Describe your project so chunks can be scored against it…"
            maxLength={2000}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />
          <button
            className="btn mt-1.5"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !projectDescription.trim()}
          >
            {analysisResult ? "Re-run analysis" : "Run analysis"}
          </button>
        </div>
      )}

      {mutation.isPending && <Spinner label={`Analysing ${file.name}…`} />}

      {mutation.isError && (
        <p className="mb-4 text-sm text-red-600">
          Analysis failed: {getErrorMessage(mutation.error)}
        </p>
      )}

      {analysisResult && !mutation.isPending && (
        <div
          className="grid grid-cols-[minmax(0,1fr)_220px] gap-4"
          style={{ height: "calc(100vh - 180px)" }}
        >
          <div className="h-full overflow-y-auto">
            <PdfChunkViewer
              file={file}
              chunks={chunks}
              activeChunkId={activeChunkId}
              onChunkClick={setActiveChunkId}
            />
          </div>

          <div className="flex h-full flex-col gap-2.5 overflow-y-auto">
            {chunks.map((chunk) => (
              <div
                key={chunk.chunk_id}
                onClick={() => setActiveChunkId(chunk.chunk_id)}
                className={`card cursor-pointer transition-colors ${
                  activeChunkId === chunk.chunk_id ? "border-2 border-border-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-500 bg-amber-400 text-[11px] font-semibold text-amber-950">
                      {chunkNumbers[chunk.chunk_id]}
                    </span>
                    <ChunkTypeBadge type={chunk.chunk_type} />
                  </div>
                  <span className="text-xs text-text-secondary">
                    p. {chunk.page_no ?? "?"} · {chunk.relevance_score}
                  </span>
                </div>
                <p className="mt-2 text-sm">{chunk.reason}</p>
                <p className="mt-1 text-xs text-text-secondary">Use: {chunk.suggested_use}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}