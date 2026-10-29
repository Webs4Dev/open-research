import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import { askQuestion, listPaperQA } from "../../api/endpoints";
import type { PDFQAResponse, QAMessage } from "../../api/types";
import { ErrorPanel } from "../common/ErrorPanel";
import { getErrorMessage } from "../../lib/errors";
import { paperQAKey } from "../../lib/queryKeys";

interface AskChatProps {
  paperId: string;
  onJumpToPage: (page: number) => void;
}

export function AskChat({ paperId, onJumpToPage }: AskChatProps) {
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: paperQAKey(paperId), queryFn: () => listPaperQA(paperId) });

  const [question, setQuestion] = useState("");
  const [announcement, setAnnouncement] = useState(""); // read out by screen readers
  const fieldId = useId();
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (text: string) => askQuestion({ paper_id: paperId, question: text }),
    // The server saved the turn; append it locally instead of refetching the whole history.
    onSuccess: (response, text) => {
      const turn: QAMessage = { id: -Date.now(), question: text, response, created_at: new Date().toISOString() };
      queryClient.setQueryData<QAMessage[]>(paperQAKey(paperId), (old = []) => [...old, turn]);
      setAnnouncement(response.answer);
    },
  });

  const messages = history.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, ask.status]);

  const submit = () => {
    const text = question.trim();
    if (!text || ask.isPending) return;
    setQuestion("");
    ask.mutate(text);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6 max-sm:p-4">
        {history.isLoading && (
          <div role="status" aria-label="Loading" aria-busy="true" className="flex animate-pulse flex-col gap-3">
            <span className="ml-auto h-10 w-2/3 rounded-lg bg-surface-2" />
            <span className="h-4 w-full rounded-sm bg-surface-2" />
            <span className="h-4 w-4/5 rounded-sm bg-surface-2" />
          </div>
        )}

        {history.isError && (
          <ErrorPanel
            message={`Couldn't load earlier questions: ${getErrorMessage(history.error)}`}
            onRetry={() => history.refetch()}
          />
        )}

        {history.isSuccess && messages.length === 0 && ask.isIdle && (
          <div>
            <h2 className="font-display text-h3 text-ink">Ask this paper anything</h2>
            <p className="mt-1 max-w-[48ch] text-body text-ink-muted">
              Answers come only from this PDF, with the pages they were found on. Your questions are saved.
            </p>
          </div>
        )}

        <ol className="flex flex-col gap-8">
          {messages.map((m) => (
            <Turn key={m.id} question={m.question} response={m.response} onJumpToPage={onJumpToPage} />
          ))}

          {ask.isPending && (
            <li className="flex flex-col gap-3">
              <Question text={ask.variables} />
              <p className="animate-pulse text-body text-ink-subtle">Reading the paper…</p>
            </li>
          )}

          {ask.isError && (
            <li className="flex flex-col gap-3">
              <Question text={ask.variables} />
              <ErrorPanel
                message={`Couldn't get an answer: ${getErrorMessage(ask.error)}`}
                onRetry={() => ask.mutate(ask.variables)}
              />
            </li>
          )}
        </ol>
        <div ref={endRef} />
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t border-hairline bg-surface-1 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Ask a question about this paper
        </label>
        <textarea
          id={fieldId}
          rows={2}
          className="textarea flex-1"
          placeholder="Ask a question about this paper"
          maxLength={1000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter is a new line. Not while an IME is composing (e.g. Japanese input).
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" aria-label="Send question" className="btn w-10 px-0" disabled={ask.isPending || !question.trim()}>
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
}

function Question({ text }: { text: string }) {
  return (
    <p className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-surface-2 px-4 py-2.5 text-body text-ink">{text}</p>
  );
}

/** Answer-first: the answer is plain full-width text, with page chips that jump the viewer. */
function Turn({
  question,
  response,
  onJumpToPage,
}: {
  question: string;
  response: PDFQAResponse;
  onJumpToPage: (page: number) => void;
}) {
  return (
    <li className="flex flex-col gap-3">
      <Question text={question} />
      <div>
        <p className="whitespace-pre-wrap text-body-lg text-ink">{response.answer}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Several matching chunks can sit on one page, so the server may repeat a page. */}
          {[...new Set(response.found_in_pages)].map((page) => (
            <button
              key={page}
              type="button"
              aria-label={`Show page ${page}`}
              className="chip bg-surface-2 font-mono text-ink-muted transition-colors duration-fast hover:bg-surface-3 hover:text-ink"
              onClick={() => onJumpToPage(page)}
            >
              p. {page}
            </button>
          ))}
          <span className="font-mono text-mono tabular-nums text-ink-subtle">{response.confidence}% confident</span>
        </div>
      </div>
    </li>
  );
}
