import type { FastifyPluginAsync } from "fastify";
import { loginSchema } from "@watchtower/shared";
import { prisma } from "@watchtower/database";
import { verifyPassword } from "../../modules/auth/password.js";
import { createSession, destroySession, SESSION_COOKIE_NAME } from "../../modules/auth/session.js";
import { ApiError } from "../../utils/errors.js";

const isProduction = process.env.NODE_ENV === "production";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { email: body.email } });
      const valid = user ? await verifyPassword(body.password, user.passwordHash) : false;

      if (!user || !valid) {
        throw new ApiError("UNAUTHORIZED", "Invalid email or password", 401);
      }

      const session = await createSession(user.id);

      reply.setCookie(SESSION_COOKIE_NAME, session.id, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        expires: session.expiresAt,
      });

      return { id: user.id, email: user.email };
    }
  );

  fastify.post("/logout", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      await destroySession(sessionId);
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { success: true };
  });

  fastify.get("/me", { preHandler: fastify.authenticate }, async (request) => {
    return { id: request.user!.id, email: request.user!.email };
  });
};
