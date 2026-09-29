import { useCallback, useEffect, useRef, useState } from "react";

/** Poll an async function while `active` is true. */
export function usePoll(fn: () => Promise<void>, active: boolean, ms = 1200) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => void saved.current(), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
}

export function useAsync<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (...a: A): Promise<R | undefined> => {
    setLoading(true);
    setError(null);
    try {
      return await fn(...a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [fn]);
  return { run, loading, error, setError };
}
