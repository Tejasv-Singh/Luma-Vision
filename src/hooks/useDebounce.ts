import { useCallback, useEffect, useRef, useState } from 'react';

/** Returns `value` after it has stayed unchanged for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Debounces a callback. The returned function is stable, and any pending
 * invocation is cancelled on unmount so a queued upload never fires against a
 * torn-down component.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay = 300,
): ((...args: Args) => void) & { cancel: () => void } {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef(callback);
  latest.current = callback;

  const cancel = useCallback(() => {
    if (timer.current !== undefined) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const debounced = useCallback(
    (...args: Args) => {
      cancel();
      timer.current = setTimeout(() => latest.current(...args), delay);
    },
    [cancel, delay],
  ) as ((...args: Args) => void) & { cancel: () => void };

  debounced.cancel = cancel;
  return debounced;
}
