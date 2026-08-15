import type { FastifyPluginAsync } from "fastify";
import { createServiceGroupSchema, updateServiceGroupSchema } from "@watchtower/shared";
import { prisma } from "@watchtower/database";
import { notFound } from "../../utils/errors.js";
import { requireWorkspaceAdmin, requireWorkspaceId } from "../../modules/workspaces/context.js";

export const serviceGroupRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.requireWorkspace);

  fastify.get("/", async (request) => {
    const workspaceId = requireWorkspaceId(request);
    const groups = await prisma.serviceGroup.findMany({
      where: { workspaceId },
      include: { _count: { select: { services: true } } },
      orderBy: { name: "asc" },
    });
    return { groups };
  });

  fastify.post("/", async (request, reply) => {
    requireWorkspaceAdmin(request);
    const workspaceId = requireWorkspaceId(request);
    const body = createServiceGroupSchema.parse(request.body);
    const group = await prisma.serviceGroup.create({ data: { ...body, workspaceId } });
    reply.status(201);
    return { group };
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request) => {
    requireWorkspaceAdmin(request);
    const workspaceId = requireWorkspaceId(request);
    const body = updateServiceGroupSchema.parse(request.body);
    const existing = await prisma.serviceGroup.findFirst({ where: { id: request.params.id, workspaceId } });
    if (!existing) throw notFound("Group not found");

    const group = await prisma.serviceGroup.update({ where: { id: existing.id }, data: body });
    return { group };
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    requireWorkspaceAdmin(request);
    const workspaceId = requireWorkspaceId(request);
    const existing = await prisma.serviceGroup.findFirst({ where: { id: request.params.id, workspaceId } });
    if (!existing) throw notFound("Group not found");

    await prisma.serviceGroup.delete({ where: { id: existing.id } });
    reply.status(204);
  });
};
