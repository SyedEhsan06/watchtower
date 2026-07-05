export interface CheckOutcome {
  status: "UP" | "DOWN";
  responseTimeMs: number | null;
  statusCode: number | null;
  errorCode: string | null;
  errorSummary: string | null;
}

export async function runHttpCheck(params: {
  url: string;
  expectedStatusCode: number;
  timeoutMs: number;
}): Promise<CheckOutcome> {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const res = await fetch(params.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    const responseTimeMs = Math.round(performance.now() - started);

    if (res.status !== params.expectedStatusCode) {
      return {
        status: "DOWN",
        responseTimeMs,
        statusCode: res.status,
        errorCode: "UNEXPECTED_STATUS",
        errorSummary: `Expected ${params.expectedStatusCode}, got ${res.status}`,
      };
    }

    return { status: "UP", responseTimeMs, statusCode: res.status, errorCode: null, errorSummary: null };
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - started);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      status: "DOWN",
      responseTimeMs,
      statusCode: null,
      errorCode: isAbort ? "TIMEOUT" : "CONNECTION_ERROR",
      errorSummary: isAbort ? "Request timed out" : (err instanceof Error ? err.message : "Connection failed"),
    };
  } finally {
    clearTimeout(timeout);
  }
}
