'use client';

import { useEffect, useMemo, useRef } from 'react';

/**
 * Returns a stable debounced wrapper of `fn`. A burst of calls collapses into a
 * single invocation `delay` ms after the last call. Used to coalesce realtime
 * (Socket.io) events so a flood of `message.status`/`channel.status` updates
 * triggers ONE refetch instead of one request per event (prevents 429 storms).
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 2000,
): (...args: A) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useMemo(
    () =>
      (...args: A) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fnRef.current(...args), delay);
      },
    [delay],
  );
}
