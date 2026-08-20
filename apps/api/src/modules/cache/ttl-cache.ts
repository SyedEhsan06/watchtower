type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function peekCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearCached(key: string): void {
  store.delete(key);
}

/**
 * Returns a cached value when it is still fresh. Concurrent callers share one
 * in-flight loader so two UI tabs cannot open two SSH sessions for the same
 * snapshot. `force` skips a fresh cache entry but still coalesces in-flight work.
 */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options?: { force?: boolean },
): Promise<T> {
  if (!options?.force) {
    const entry = store.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = loader()
    .then((data) => {
      setCached(key, data, ttlMs);
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise;
}

/** Test helper — not used in production routes. */
export function resetTtlCache(): void {
  store.clear();
  inflight.clear();
}
