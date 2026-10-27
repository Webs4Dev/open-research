import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

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
    <div className="flex flex-col items-center gap-2 py-10 text-sm text-text-secondary">
      <RefreshCw size={20} className="animate-spin" />
      <p>{label}</p>
      <p className="text-xs text-text-muted tabular-nums">{seconds}s elapsed</p>
      {onCancel && (
        <button className="btn-secondary px-2.5 py-1.5 text-xs" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
