import { Socket } from "node:net";
import type { CheckOutcome } from "./http-check.js";

export function runTcpCheck(params: { host: string; port: number; timeoutMs: number }): Promise<CheckOutcome> {
  return new Promise((resolve) => {
    const started = performance.now();
    const socket = new Socket();
    let settled = false;

    function finish(outcome: CheckOutcome) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(outcome);
    }

    socket.setTimeout(params.timeoutMs);

    socket.once("connect", () => {
      finish({
        status: "UP",
        responseTimeMs: Math.round(performance.now() - started),
        statusCode: null,
        errorCode: null,
        errorSummary: null,
      });
    });

    socket.once("timeout", () => {
      finish({
        status: "DOWN",
        responseTimeMs: Math.round(performance.now() - started),
        statusCode: null,
        errorCode: "TIMEOUT",
        errorSummary: "Connection timed out",
      });
    });

    socket.once("error", (err) => {
      finish({
        status: "DOWN",
        responseTimeMs: Math.round(performance.now() - started),
        statusCode: null,
        errorCode: "CONNECTION_ERROR",
        errorSummary: err.message,
      });
    });

    socket.connect(params.port, params.host);
  });
}
