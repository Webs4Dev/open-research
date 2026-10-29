/** Inline error with an optional retry (DESIGN.md "Errors": never a blank region). */
export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-soft px-4 py-3">
      <p className="text-body-sm text-red">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary min-h-8 px-3 text-body-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
