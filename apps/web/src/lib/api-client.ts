const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/** Browser-side fetch to the Fastify API. Cookies are sent automatically via credentials: include. */
export async function apiClientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: "INTERNAL_ERROR", message: "Request failed" }));
    throw new ApiClientError(body.code, body.message, body.details);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
