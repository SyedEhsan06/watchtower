import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@watchtower/database";
import { prisma, type WorkspaceRole } from "@watchtower/database";
import { getSessionUser, SESSION_COOKIE_NAME } from "../modules/auth/session.js";
import { forbidden, unauthorized } from "../utils/errors.js";
import { WORKSPACE_COOKIE_NAME } from "../modules/workspaces/context.js";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    workspaceId: string | null;
    workspaceRole: WorkspaceRole | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireWorkspace: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("user", null);
  fastify.decorateRequest("workspaceId", null);
  fastify.decorateRequest("workspaceRole", null);

  fastify.addHook("onRequest", async (request) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      request.user = null;
      return;
    }
    request.user = await getSessionUser(sessionId);

    request.workspaceId = null;
    request.workspaceRole = null;
    if (!request.user) return;

    const requestedWorkspaceId = request.cookies[WORKSPACE_COOKIE_NAME];
    if (request.user.isPlatformOwner && requestedWorkspaceId) {
      const workspace = await prisma.workspace.findUnique({ where: { id: requestedWorkspaceId }, select: { id: true } });
      if (workspace) {
        request.workspaceId = workspace.id;
        request.workspaceRole = "OWNER";
        return;
      }
    } else if (requestedWorkspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: requestedWorkspaceId, userId: request.user.id } },
        select: { workspaceId: true, role: true },
      });
      if (membership) {
        request.workspaceId = membership.workspaceId;
        request.workspaceRole = membership.role;
        return;
      }
    }

    if (request.user.isPlatformOwner) {
      const fallbackWorkspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
      if (fallbackWorkspace) {
        request.workspaceId = fallbackWorkspace.id;
        request.workspaceRole = "OWNER";
      }
    } else {
      const fallbackMember = await prisma.workspaceMember.findFirst({
        where: { userId: request.user.id },
        orderBy: { createdAt: "asc" },
        select: { workspaceId: true, role: true },
      });
      if (fallbackMember) {
        request.workspaceId = fallbackMember.workspaceId;
        request.workspaceRole = fallbackMember.role;
      }
    }
  });

  fastify.decorate("authenticate", async (request: FastifyRequest) => {
    if (!request.user) {
      throw unauthorized();
    }
  });

  fastify.decorate("requireWorkspace", async (request: FastifyRequest) => {
    if (!request.user) throw unauthorized();
    if (!request.workspaceId) throw forbidden("Select a project before continuing");
  });
};

export default fp(authPlugin);
