import { describe, it, expect } from "vitest";
import { createLimiter } from "./concurrency-limit.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createLimiter", () => {
  it("never runs more than `limit` tasks concurrently", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let maxActive = 0;

    const gates = Array.from({ length: 5 }, () => deferred<void>());

    const runs = gates.map((gate, i) =>
      limit(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await gate.promise;
        active--;
        return i;
      })
    );

    // release tasks one at a time, in order, so max concurrency is observable
    for (const gate of gates) {
      gate.resolve();
      await new Promise((r) => setTimeout(r, 5));
    }

    const results = await Promise.all(runs);
    expect(results).toEqual([0, 1, 2, 3, 4]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("propagates task rejection without blocking subsequent tasks", async () => {
    const limit = createLimiter(1);

    await expect(
      limit(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const result = await limit(async () => "ok");
    expect(result).toBe("ok");
  });
});
