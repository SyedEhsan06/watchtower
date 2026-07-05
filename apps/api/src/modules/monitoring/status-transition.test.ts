import { describe, it, expect } from "vitest";
import { computeTransition } from "./status-transition.js";

describe("computeTransition", () => {
  it("keeps a healthy service UP on a successful check", () => {
    const result = computeTransition({
      currentStatus: "UP",
      consecutiveFailures: 0,
      failureThreshold: 2,
      checkPassed: true,
    });
    expect(result).toMatchObject({ nextStatus: "UP", nextConsecutiveFailures: 0, becameDown: false, recovered: false });
  });

  it("degrades (not DOWN) after a single failure with default threshold of 2", () => {
    const result = computeTransition({
      currentStatus: "UP",
      consecutiveFailures: 0,
      failureThreshold: 2,
      checkPassed: false,
    });
    expect(result.nextStatus).toBe("DEGRADED");
    expect(result.nextConsecutiveFailures).toBe(1);
    expect(result.becameDown).toBe(false);
  });

  it("marks DOWN only once the failure threshold is reached", () => {
    const result = computeTransition({
      currentStatus: "DEGRADED",
      consecutiveFailures: 1,
      failureThreshold: 2,
      checkPassed: false,
    });
    expect(result.nextStatus).toBe("DOWN");
    expect(result.nextConsecutiveFailures).toBe(2);
    expect(result.becameDown).toBe(true);
  });

  it("does not re-fire becameDown for a service that is already DOWN", () => {
    const result = computeTransition({
      currentStatus: "DOWN",
      consecutiveFailures: 5,
      failureThreshold: 2,
      checkPassed: false,
    });
    expect(result.nextStatus).toBe("DOWN");
    expect(result.becameDown).toBe(false);
  });

  it("recovers to UP immediately on the first successful check after DOWN", () => {
    const result = computeTransition({
      currentStatus: "DOWN",
      consecutiveFailures: 5,
      failureThreshold: 2,
      checkPassed: true,
    });
    expect(result.nextStatus).toBe("UP");
    expect(result.nextConsecutiveFailures).toBe(0);
    expect(result.recovered).toBe(true);
  });

  it("does not mark recovered=true when a DEGRADED (never fully DOWN) service passes", () => {
    const result = computeTransition({
      currentStatus: "DEGRADED",
      consecutiveFailures: 1,
      failureThreshold: 2,
      checkPassed: true,
    });
    expect(result.nextStatus).toBe("UP");
    expect(result.recovered).toBe(false);
  });

  it("respects a custom failure threshold", () => {
    const afterTwoFailures = computeTransition({
      currentStatus: "UP",
      consecutiveFailures: 2,
      failureThreshold: 5,
      checkPassed: false,
    });
    expect(afterTwoFailures.nextStatus).toBe("DEGRADED");

    const afterFiveFailures = computeTransition({
      currentStatus: "DEGRADED",
      consecutiveFailures: 4,
      failureThreshold: 5,
      checkPassed: false,
    });
    expect(afterFiveFailures.nextStatus).toBe("DOWN");
  });
});
