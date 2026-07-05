import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@watchtower/database";
import { sendPushToAllSubscriptions } from "../../modules/push/web-push.js";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/subscribe", async (request, reply) => {
    const body = subscribeSchema.parse(request.body);
    const userId = request.user!.id;

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
      create: { userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

    reply.status(201);
    return { success: true };
  });

  fastify.delete("/subscribe", async (request) => {
    const body = z.object({ endpoint: z.string().url() }).parse(request.body);
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
    return { success: true };
  });

  fastify.post("/test", async () => {
    await sendPushToAllSubscriptions({
      title: "Watchtower test notification",
      body: "Push notifications are working.",
    });
    return { success: true };
  });
};
