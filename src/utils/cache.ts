/**
 * In-memory TTL cache with request de-duplication.
 *
 * Analysis payloads are large and immutable once a job completes, so repeat
 * tab switches should never re-hit the network. `dedupe` additionally collapses
 * concurrent calls for the same key into a single in-flight promise, which
 * matters because five tabs can mount and fetch at once.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** Removes a single key, or every key whose name starts with `prefix`. */
export function cacheInvalidate(keyOrPrefix: string, prefix = false): void {
  if (!prefix) {
    store.delete(keyOrPrefix);
    inflight.delete(keyOrPrefix);
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(keyOrPrefix)) store.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(keyOrPrefix)) inflight.delete(key);
  }
}

export function cacheClear(): void {
  store.clear();
  inflight.clear();
}

/**
 * Returns the cached value, the in-flight promise, or starts `loader`.
 * Failures are never cached — a rejected loader clears its in-flight slot so
 * the next call retries cleanly.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = loader()
    .then((value) => cacheSet(key, value, ttlMs))
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
