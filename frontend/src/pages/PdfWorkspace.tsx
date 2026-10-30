import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadDropzone } from "../components/workspace/UploadDropzone";
import { Spinner } from "../components/common/Spinner";
import { ErrorPanel } from "../components/common/ErrorPanel";
import { PapersPanel } from "./Dashboard";
import { ingestPdf } from "../api/endpoints";
import { HISTORY_PAPERS_KEY, paperFileKey } from "../lib/queryKeys";
import { getErrorMessage, isCancelled } from "../lib/errors";
import { useAbortController } from "../lib/useAbortController";
import { useIsDemo } from "../lib/auth";

/** Upload a paper (ingested right away, so Ask works) and open it in the paper view. */
export function PdfWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDemo = useIsDemo();
  const { nextSignal, cancel } = useAbortController();

  const ingest = useMutation({
    mutationFn: (file: File) => ingestPdf(file, nextSignal()),
    onSuccess: (result, file) => {
      queryClient.invalidateQueries({ queryKey: HISTORY_PAPERS_KEY });
      queryClient.setQueryData(paperFileKey(result.paper_id), file); // the viewer needn't download it back
      navigate(`/workspace/${result.paper_id}`);
    },
  });

  return (
    <div className="pb-16">
      <header className="mb-10">
        <h1 className="font-display text-h1 text-ink max-sm:text-h1-sm">Workspace</h1>
        <p className="mt-2 max-w-[60ch] text-body-lg text-ink-muted">
          Upload a paper to see the passages that matter to your project highlighted, and ask it questions.
        </p>
      </header>

      {ingest.isPending ? (
        <Spinner label={`Reading ${ingest.variables.name}…`} onCancel={cancel} />
      ) : isDemo ? (
        <p className="rounded-xl border border-hairline bg-surface-1 px-6 py-8 text-center text-body text-ink-muted">
          Uploading is switched off in the demo. Open the sample paper below to see its highlights and answers.
        </p>
      ) : (
        <UploadDropzone onFileSelected={(file) => ingest.mutate(file)} />
      )}

      {ingest.isError && (
        <div className="mt-4">
          {isCancelled(ingest.error) ? (
            <p className="text-body-sm text-ink-subtle">Upload cancelled.</p>
          ) : (
            <ErrorPanel
              message={`Couldn't read ${ingest.variables.name}: ${getErrorMessage(ingest.error)}`}
              onRetry={() => ingest.mutate(ingest.variables)}
            />
          )}
        </div>
      )}

      <div className="mt-12">
        <PapersPanel uploadLink={false} />
      </div>
    </div>
  );
}
