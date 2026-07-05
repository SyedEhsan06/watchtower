import type { ServiceStatusValue } from "@watchtower/shared";

export interface TransitionInput {
  currentStatus: ServiceStatusValue;
  consecutiveFailures: number;
  failureThreshold: number;
  checkPassed: boolean;
}

export interface TransitionResult {
  nextStatus: ServiceStatusValue;
  nextConsecutiveFailures: number;
  /** true only on the check that flips the service from healthy to DOWN */
  becameDown: boolean;
  /** true only on the check that flips the service from DOWN to healthy */
  recovered: boolean;
}

/**
 * Pure status transition function — no I/O, fully unit-testable.
 * Default policy: N consecutive failures (failureThreshold) => DOWN.
 * Before the threshold is hit, a failing service is DEGRADED, not DOWN.
 * A single successful check recovers a DOWN or DEGRADED service to UP.
 */
export function computeTransition(input: TransitionInput): TransitionResult {
  const { currentStatus, consecutiveFailures, failureThreshold, checkPassed } = input;

  if (checkPassed) {
    const wasDown = currentStatus === "DOWN";
    return {
      nextStatus: "UP",
      nextConsecutiveFailures: 0,
      becameDown: false,
      recovered: wasDown,
    };
  }

  const nextConsecutiveFailures = consecutiveFailures + 1;
  const crossesThreshold = nextConsecutiveFailures >= failureThreshold;
  const wasAlreadyDown = currentStatus === "DOWN";

  if (crossesThreshold) {
    return {
      nextStatus: "DOWN",
      nextConsecutiveFailures,
      becameDown: !wasAlreadyDown,
      recovered: false,
    };
  }

  return {
    nextStatus: "DEGRADED",
    nextConsecutiveFailures,
    becameDown: false,
    recovered: false,
  };
}
