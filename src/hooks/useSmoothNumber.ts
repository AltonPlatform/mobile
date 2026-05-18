import {useEffect, useRef, useState} from 'react';

type Options = {
  /** Длительность линейного сегмента (мс). */
  durationMs?: number;
};

/**
 * Линейно догоняет `target` за `durationMs` (по умолчанию 1 с).
 * Каждый новый target — новый сегмент с текущего значения.
 */
export function useSmoothNumber(target: number, options: Options = {}): number {
  const durationMs = options.durationMs ?? 1000;
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      displayRef.current = 0;
      setDisplay(0);
      return;
    }

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    const from = displayRef.current;
    const to = target;
    if (from === to) {
      return;
    }

    const startAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startAt;
      const t = Math.min(1, elapsed / durationMs);
      const next = from + (to - from) * t;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = to;
        setDisplay(to);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, durationMs]);

  return display;
}
