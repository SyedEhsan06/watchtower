import type { FastifyPluginAsync } from "fastify";
import { createServiceGroupSchema, updateServiceGroupSchema } from "@watchtower/shared";
import { prisma } from "@watchtower/database";
import { notFound } from "../../utils/errors.js";

export const serviceGroupRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async () => {
    const groups = await prisma.serviceGroup.findMany({
      include: { _count: { select: { services: true } } },
      orderBy: { name: "asc" },
    });
    return { groups };
  });

  fastify.post("/", async (request, reply) => {
    const body = createServiceGroupSchema.parse(request.body);
    const group = await prisma.serviceGroup.create({ data: body });
    reply.status(201);
    return { group };
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const body = updateServiceGroupSchema.parse(request.body);
    const existing = await prisma.serviceGroup.findUnique({ where: { id: request.params.id } });
    if (!existing) throw notFound("Group not found");

    const group = await prisma.serviceGroup.update({ where: { id: request.params.id }, data: body });
    return { group };
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const existing = await prisma.serviceGroup.findUnique({ where: { id: request.params.id } });
    if (!existing) throw notFound("Group not found");

    await prisma.serviceGroup.delete({ where: { id: request.params.id } });
    reply.status(204);
  });
};
