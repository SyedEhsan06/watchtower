import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@watchtower/database";
import { getSessionUser, SESSION_COOKIE_NAME } from "../modules/auth/session.js";
import { unauthorized } from "../utils/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("user", null);

  fastify.addHook("onRequest", async (request) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      request.user = null;
      return;
    }
    request.user = await getSessionUser(sessionId);
  });

  fastify.decorate("authenticate", async (request: FastifyRequest) => {
    if (!request.user) {
      throw unauthorized();
    }
  });
};

export default fp(authPlugin);
