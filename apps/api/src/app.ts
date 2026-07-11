import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { loggerOptions } from "./utils/logger.js";
import authPlugin from "./plugins/auth.js";
import apiKeyAuthPlugin from "./plugins/api-key-auth.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import { authRoutes } from "./routes/auth/index.js";
import { serverRoutes } from "./routes/servers/index.js";
import { serviceRoutes } from "./routes/services/index.js";
import { serviceGroupRoutes } from "./routes/service-groups/index.js";
import { incidentRoutes } from "./routes/incidents/index.js";
import { auditRoutes } from "./routes/audit/index.js";
import { pushRoutes } from "./routes/push/index.js";
import { externalRoutes } from "./routes/external/index.js";

export async function buildApp() {
  const app = Fastify({
    logger: loggerOptions,
    bodyLimit: 1024 * 1024, // 1MB, generous enough for SSH private keys, small for everything else
  });

  await app.register(helmet);
  // APP_URLS is a comma-separated allowlist for local dev (multiple ports
  // across concurrent projects on one machine); falls back to the single
  // APP_URL/localhost:3000 default if unset, so production (one real
  // origin) doesn't need to change.
  const allowedOrigins = (process.env.APP_URLS ?? process.env.APP_URL ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
  });

  // Some POST routes (e.g. restart-triggering actions with no required body)
  // are called with Content-Type: application/json but an empty body. Fastify's
  // default JSON parser throws on that; treat empty bodies as `undefined` instead
  // of a parse error so downstream Zod schemas (which all treat missing fields as
  // optional/absent) can validate normally.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    if (typeof body === "string" && body.trim().length === 0) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(apiKeyAuthPlugin);

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(serverRoutes, { prefix: "/servers" });
  await app.register(serviceRoutes, { prefix: "/services" });
  await app.register(serviceGroupRoutes, { prefix: "/service-groups" });
  await app.register(incidentRoutes, { prefix: "/incidents" });
  await app.register(auditRoutes, { prefix: "/audit-logs" });
  await app.register(pushRoutes, { prefix: "/push" });
  await app.register(externalRoutes, { prefix: "/external" });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
