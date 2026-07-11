import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { resolveApiKey } from "../modules/auth/api-key.js";
import { unauthorized } from "../utils/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by requireApiKey once a Bearer key has been resolved. Null otherwise. */
    apiKeyServerId: string | null;
  }
  interface FastifyInstance {
    /**
     * Parallel auth mechanism to `authenticate` (session cookies), for
     * external machine-to-machine callers. Reads `Authorization: Bearer
     * <key>`, resolves it to a non-revoked ApiKey, and attaches its
     * serverId to the request so route handlers can enforce scope.
     */
    requireApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const apiKeyAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("apiKeyServerId", null);

  fastify.decorate("requireApiKey", async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw unauthorized("Missing or malformed Authorization header");
    }

    const plaintextKey = header.slice("Bearer ".length).trim();
    const record = await resolveApiKey(plaintextKey);
    if (!record) {
      throw unauthorized("Invalid or revoked API key");
    }

    request.apiKeyServerId = record.serverId;
  });
};

export default fp(apiKeyAuthPlugin);
