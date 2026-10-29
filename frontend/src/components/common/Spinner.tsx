import { useEffect, useState } from "react";

type Props = {
  label: string;
  /** Shows a Cancel button when set. */
  onCancel?: () => void;
};

export function Spinner({ label, onCancel }: Props) {
  // Mounted only while a request is pending, so this counts from its start.
  // Wall-clock based: background tabs throttle intervals, so tick counting drifts.
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card flex flex-col gap-4">
      {/* Indeterminate aurora bar: one of the gradient's allowed places (DESIGN.md). */}
      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-2/5 animate-sweep rounded-full bg-aurora" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-body text-ink">
          {label}
        </p>
        <div className="flex items-center gap-3">
          {/* Hidden from screen readers so they don't announce every second. */}
          <span aria-hidden className="font-mono text-mono tabular-nums text-ink-subtle">
            {seconds}s
          </span>
          {onCancel && (
            <button type="button" className="btn-secondary min-h-8 px-3 text-body-sm" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
