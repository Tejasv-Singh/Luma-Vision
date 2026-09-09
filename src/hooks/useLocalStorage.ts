import { useCallback, useEffect, useState } from 'react';

/**
 * `useState` backed by localStorage.
 *
 * Every access is guarded: private-browsing modes and storage-blocked contexts
 * throw on read/write, and the app must keep working with in-memory state only.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initialValue : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled — state stays session-only.
    }
  }, [key, value]);

  // Keep duplicate tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        // Ignore malformed cross-tab writes.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  return [value, setValue, reset] as const;
}
