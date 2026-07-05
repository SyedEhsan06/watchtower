import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@watchtower/database";
import { notFound } from "../../utils/errors.js";

export const incidentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    const { active } = request.query as { active?: string };
    const incidents = await prisma.incident.findMany({
      where: active === "true" ? { resolvedAt: null } : undefined,
      include: { service: { select: { id: true, name: true, serverId: true } } },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return { incidents };
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (request) => {
    const incident = await prisma.incident.findUnique({
      where: { id: request.params.id },
      include: { service: { select: { id: true, name: true, serverId: true } } },
    });
    if (!incident) throw notFound("Incident not found");
    return { incident };
  });
};
