import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@watchtower/database";
import { notFound } from "../../utils/errors.js";
import { requireWorkspaceId } from "../../modules/workspaces/context.js";

export const incidentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.requireWorkspace);

  fastify.get("/", async (request) => {
    const workspaceId = requireWorkspaceId(request);
    const { active } = request.query as { active?: string };
    const incidents = await prisma.incident.findMany({
      where: { workspaceId, ...(active === "true" ? { resolvedAt: null } : {}) },
      include: { service: { select: { id: true, name: true, serverId: true } } },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return { incidents };
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (request) => {
    const workspaceId = requireWorkspaceId(request);
    const incident = await prisma.incident.findFirst({
      where: { id: request.params.id, workspaceId },
      include: { service: { select: { id: true, name: true, serverId: true } } },
    });
    if (!incident) throw notFound("Incident not found");
    return { incident };
  });
};
