"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";

export const WATCHTOWER_REFRESH_EVENT = "watchtower:refresh";
export const WATCHTOWER_SOFT_REFRESH_EVENT = "watchtower:soft-refresh";

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

const VISIBILITY_STALE_MS = 8_000;

function withFreshParam(path: string, fresh: boolean): string {
  if (!fresh) return path;
  return path.includes("?") ? `${path}&fresh=1` : `${path}?fresh=1`;
}

export function useLiveResource<T>({
  path,
  enabled = true,
  refreshIntervalMs,
  initialData,
}: {
  path: string;
  enabled?: boolean;
  refreshIntervalMs?: number;
  initialData?: T;
}) {
  const cached = cache.get(path) as CacheEntry<T> | undefined;
  const seed =
    cached ??
    (initialData !== undefined
      ? { data: initialData, fetchedAt: Date.now() }
      : undefined);

  const [data, setData] = useState<T | null>(seed?.data ?? null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(
    seed?.fetchedAt ?? null,
  );
  const [loading, setLoading] = useState(seed === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const fetchedAtRef = useRef(fetchedAt);
  fetchedAtRef.current = fetchedAt;
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (fresh: boolean) => {
      const requestId = ++requestIdRef.current;
      const hasData = cache.has(path) || dataRef.current !== null;
      if (hasData) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await apiClientFetch<T>(withFreshParam(path, fresh));
        if (requestId !== requestIdRef.current) return;
        const nextFetchedAt = Date.now();
        cache.set(path, { data: result, fetchedAt: nextFetchedAt });
        setData(result);
        setFetchedAt(nextFetchedAt);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(
          err instanceof ApiClientError ? err.message : "Failed to load",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path],
  );

  useEffect(() => {
    if (!enabled) return;
    void load(false);
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const age = fetchedAtRef.current
        ? Date.now() - fetchedAtRef.current
        : Number.POSITIVE_INFINITY;
      if (age < VISIBILITY_STALE_MS) return;
      void load(false);
    }

    function onManualRefresh() {
      void load(true);
    }

    function onSoftRefresh() {
      void load(false);
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(WATCHTOWER_REFRESH_EVENT, onManualRefresh);
    window.addEventListener(WATCHTOWER_SOFT_REFRESH_EVENT, onSoftRefresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(WATCHTOWER_REFRESH_EVENT, onManualRefresh);
      window.removeEventListener(WATCHTOWER_SOFT_REFRESH_EVENT, onSoftRefresh);
    };
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled || !refreshIntervalMs) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(false);
      }
    }, refreshIntervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, refreshIntervalMs, load]);

  return {
    data,
    loading,
    refreshing,
    error,
    fetchedAt,
    refresh: () => {
      void load(true);
    },
  };
}
