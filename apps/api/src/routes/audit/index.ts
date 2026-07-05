import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@watchtower/database";

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    const { serverId, serviceId } = request.query as { serverId?: string; serviceId?: string };
    const logs = await prisma.auditLog.findMany({
      where: {
        serverId: serverId || undefined,
        serviceId: serviceId || undefined,
      },
      include: {
        user: { select: { id: true, email: true } },
        server: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return { logs };
  });
};
