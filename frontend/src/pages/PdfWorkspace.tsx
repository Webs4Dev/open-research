import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { UploadDropzone } from "../components/workspace/UploadDropzone";
import { ChoiceCards } from "../components/workspace/ChoiceCards";
import { AskChat } from "../components/workspace/AskChat";
import { Spinner } from "../components/common/Spinner";
import { ingestPdf } from "../api/endpoints";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useActivityStore } from "../store/activityStore";
import { getErrorMessage } from "../lib/errors";

type Stage = "dropzone" | "choice" | "ingesting" | "chat";

export function PdfWorkspace() {
  const navigate = useNavigate();
  const file = useWorkspaceStore((s) => s.file);
  const setFile = useWorkspaceStore((s) => s.setFile);
  const ingestResult = useWorkspaceStore((s) => s.ingestResult);
  const setIngestResult = useWorkspaceStore((s) => s.setIngestResult);
  const resetWorkspace = useWorkspaceStore((s) => s.reset);

  const [stage, setStage] = useState<Stage>(file && ingestResult ? "chat" : "dropzone");

  const logActivity = useActivityStore((s) => s.logActivity);

  const ingestMutation = useMutation({
    mutationFn: (f: File) => ingestPdf(f),
    onSuccess: (result) => {
      setIngestResult(result);
      setStage("chat");
      logActivity({
        type: "ingest",
        label: result.filename,
        detail: `${result.pages} pages · ${result.chunks_stored} chunks`,
      });
    },
    // Back to the choice cards so the user can retry or pick another action.
    onError: () => setStage("choice"),
  });

  const handleFileSelected = (f: File) => {
    resetWorkspace();
    ingestMutation.reset();
    setFile(f);
    setStage("choice");
  };

  const handleSwap = () => {
    resetWorkspace();
    ingestMutation.reset();
    setStage("dropzone");
  };

  const handleAnalyse = () => {
    // Analysis itself runs on the Analyze page so the project-description
    // box lives next to the results — the file is already in the store.
    navigate("/workspace/analyze");
  };

  const handleIngestAndAsk = () => {
    if (!file) return;
    setStage("ingesting");
    ingestMutation.mutate(file);
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-medium">PDF workspace</h1>

      {stage === "dropzone" && <UploadDropzone onFileSelected={handleFileSelected} />}

      {stage === "choice" && ingestMutation.isError && (
        <p className="mb-3 text-sm text-red-600">
          Ingest failed: {getErrorMessage(ingestMutation.error)}
        </p>
      )}

      {stage === "choice" && file && (
        <ChoiceCards
          filename={file.name}
          onSwap={handleSwap}
          onAnalyse={handleAnalyse}
          onIngestAndAsk={handleIngestAndAsk}
        />
      )}

      {stage === "ingesting" && <Spinner label={`Ingesting ${file?.name}…`} />}

      {stage === "chat" && file && ingestResult && (
        <div>
          <div className="mb-4 flex items-center gap-2.5 rounded bg-surface-1 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{ingestResult.filename}</p>
              <p className="flex items-center gap-1 text-xs text-text-success">
                <CheckCircle2 size={13} />
                Ingested · {ingestResult.pages} pages · {ingestResult.chunks_stored} chunks
              </p>
            </div>
            <button className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => setStage("choice")}>
              <ArrowLeft size={13} />
              Back
            </button>
          </div>

          <AskChat paperId={ingestResult.paper_id} paperTitle={ingestResult.filename} />
        </div>
      )}
    </div>
  );
}
