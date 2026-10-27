import { useEffect, useRef } from "react";

/**
 * Gives each request its own AbortSignal so a Cancel button can stop it.
 * Starting a new request aborts the previous one, and so does unmounting.
 */
export function useAbortController() {
  const ref = useRef<AbortController | null>(null);

  useEffect(() => () => ref.current?.abort(), []);

  const nextSignal = () => {
    ref.current?.abort();
    ref.current = new AbortController();
    return ref.current.signal;
  };

  const cancel = () => ref.current?.abort();

  return { nextSignal, cancel };
}
