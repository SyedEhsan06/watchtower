import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Server-side fetch to the Fastify API. Forwards the session cookie so the
 * API can authenticate the request. Only ever called from Server Components,
 * Route Handlers, or Server Actions — never exposed to the browser bundle.
 */
export async function apiServerFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: cookieHeader,
    },
    cache: "no-store",
  });
}

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const res = await apiServerFetch("/auth/me");
  if (!res.ok) return null;
  return res.json();
}
