import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { askQuestion } from "../../api/endpoints";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useActivityStore } from "../../store/activityStore";

interface AskChatProps {
  paperId: string;
  paperTitle: string;
}

export function AskChat({ paperId, paperTitle }: AskChatProps) {
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatHistory = useWorkspaceStore((s) => s.chatHistory);
  const addChatTurn = useWorkspaceStore((s) => s.addChatTurn);
  const updateChatTurn = useWorkspaceStore((s) => s.updateChatTurn);
  const logActivity = useActivityStore((s) => s.logActivity);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    const id = crypto.randomUUID();
    addChatTurn({ id, question: trimmed, status: "pending" });
    setQuestion("");
    setIsSending(true);

    try {
      const result = await askQuestion({ paper_id: paperId, question: trimmed });
      updateChatTurn(id, {
        status: "done",
        answer: result.answer,
        confidence: result.confidence,
        foundInPages: result.found_in_pages,
      });
      logActivity({ type: "ask", label: trimmed, detail: paperTitle });
    } catch {
      updateChatTurn(id, {
        status: "error",
        errorMessage: "Couldn't get an answer -- check the backend connection and try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <p className="mb-2.5 text-xs text-text-muted">Ask this PDF</p>

      <div className="mb-3 flex flex-col gap-2.5">
        {chatHistory.length === 0 && (
          <p className="rounded bg-surface-1 px-3 py-6 text-center text-sm text-text-secondary">
            Ask a question below to get started.
          </p>
        )}

        {chatHistory.map((turn) => (
          <div key={turn.id} className="rounded bg-surface-1 p-3">
            <p className="mb-2 text-sm">
              <span className="font-medium">You</span> -- {turn.question}
            </p>

            {turn.status === "pending" && (
              <p className="text-sm text-text-muted">Thinking...</p>
            )}

            {turn.status === "error" && (
              <p className="text-sm text-red-600">{turn.errorMessage}</p>
            )}

            {turn.status === "done" && (
              <div className="rounded border border-border bg-surface-0 p-2.5">
                <p className="mb-1.5 text-sm font-medium">
                  Answer &middot; confidence {turn.confidence}
                </p>
                <p className="text-sm">{turn.answer}</p>
                {turn.foundInPages && turn.foundInPages.length > 0 && (
                  <p className="mt-1.5 text-xs text-text-secondary">
                    Found on page{turn.foundInPages.length > 1 ? "s" : ""}{" "}
                    {turn.foundInPages.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask a question about this PDF"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          disabled={isSending}
        />
        <button className="btn px-3" onClick={handleAsk} disabled={isSending || !question.trim()}>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}