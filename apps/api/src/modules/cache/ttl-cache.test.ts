import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCached,
  peekCached,
  resetTtlCache,
  setCached,
} from "./ttl-cache.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

afterEach(() => {
  resetTtlCache();
  vi.useRealTimers();
});

describe("getCached", () => {
  it("loads once and serves the cached value within the TTL", async () => {
    const loader = vi.fn().mockResolvedValue("metrics");
    const first = await getCached("server-a", 10_000, loader);
    const second = await getCached("server-a", 10_000, loader);
    expect(first).toBe("metrics");
    expect(second).toBe("metrics");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reloads after the TTL expires", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");
    await getCached("server-a", 1_000, loader);
    await vi.advanceTimersByTimeAsync(1_001);
    const next = await getCached("server-a", 1_000, loader);
    expect(next).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent misses into a single loader call", async () => {
    const gate = deferred<string>();
    const loader = vi.fn(() => gate.promise);
    const first = getCached("server-a", 10_000, loader);
    const second = getCached("server-a", 10_000, loader);
    expect(loader).toHaveBeenCalledTimes(1);
    gate.resolve("shared");
    await expect(first).resolves.toBe("shared");
    await expect(second).resolves.toBe("shared");
  });

  it("bypasses a fresh cache entry when force is set", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");
    await getCached("server-a", 10_000, loader);
    const forced = await getCached("server-a", 10_000, loader, { force: true });
    expect(forced).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("still coalesces an in-flight load when force is set", async () => {
    const gate = deferred<string>();
    const loader = vi.fn(() => gate.promise);
    const first = getCached("server-a", 10_000, loader);
    const forced = getCached("server-a", 10_000, loader, { force: true });
    expect(loader).toHaveBeenCalledTimes(1);
    gate.resolve("one-ssh");
    await expect(first).resolves.toBe("one-ssh");
    await expect(forced).resolves.toBe("one-ssh");
  });
});

describe("setCached / peekCached", () => {
  it("lets a scan seed the cache for later GETs", () => {
    setCached("live:metrics:abc", { cpu: 12 }, 10_000);
    expect(peekCached("live:metrics:abc")).toEqual({ cpu: 12 });
  });
});
