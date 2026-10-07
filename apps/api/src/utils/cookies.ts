const isProduction = process.env.NODE_ENV === "production";

/**
 * Shared options for the session and workspace cookies.
 *
 * COOKIE_DOMAIN: optional, e.g. ".example.com", when the web app and API live
 * on different subdomains. Leave unset to scope cookies to the API host.
 * COOKIE_SECURE: "true" | "false". Defaults to true in production. Set to
 * "false" only when serving over plain HTTP (e.g. the local Docker quickstart).
 */
export function cookieBaseOptions() {
  const secureEnv = process.env.COOKIE_SECURE;
  return {
    httpOnly: true,
    secure: secureEnv === undefined ? isProduction : secureEnv === "true",
    sameSite: "lax" as const,
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

export function cookieClearOptions() {
  const { path, domain } = cookieBaseOptions();
  return { path, domain };
}
