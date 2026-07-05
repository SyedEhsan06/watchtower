import type { FastifyPluginAsync } from "fastify";
import { createServiceSchema, updateServiceSchema } from "@watchtower/shared";
import { prisma } from "@watchtower/database";
import { notFound, badRequest, ApiError } from "../../utils/errors.js";
import { executeServiceCheck } from "../../modules/monitoring/run-check.js";
import { loadServerSshParams } from "../../modules/ssh/server-credentials.js";
import { getDockerLogs, inspectDockerContainer, restartDockerContainer } from "../../modules/docker/docker.js";
import { getPm2Logs, restartPm2Process } from "../../modules/pm2/pm2.js";
import { getSystemdLogs, getSystemdStatus, restartSystemdUnit } from "../../modules/systemd/systemd.js";
import { getGitInfoForDirectory } from "../../modules/git/git.js";
import { recordAuditLog } from "../../modules/audit/audit-log.js";
import { restartConfirmSchema } from "./restart-schema.js";

export const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    const { serverId } = request.query as { serverId?: string };
    const services = await prisma.service.findMany({
      where: serverId ? { serverId } : undefined,
      include: {
        server: { select: { id: true, name: true, environment: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { services };
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (request) => {
    const service = await prisma.service.findUnique({
      where: { id: request.params.id },
      include: {
        server: { select: { id: true, name: true, environment: true } },
        group: { select: { id: true, name: true } },
      },
    });
    if (!service) throw notFound("Service not found");
    return { service };
  });

  fastify.post("/", async (request, reply) => {
    const body = createServiceSchema.parse(request.body);

    const nextCheckAt = new Date();
    const service = await prisma.service.create({
      data: { ...body, nextCheckAt },
    });

    reply.status(201);
    return { service };
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const body = updateServiceSchema.parse(request.body);

    const existing = await prisma.service.findUnique({ where: { id: request.params.id } });
    if (!existing) throw notFound("Service not found");

    const service = await prisma.service.update({
      where: { id: request.params.id },
      data: body,
    });
    return { service };
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const existing = await prisma.service.findUnique({ where: { id: request.params.id } });
    if (!existing) throw notFound("Service not found");

    await prisma.service.delete({ where: { id: request.params.id } });
    reply.status(204);
  });

  fastify.get<{ Params: { id: string } }>("/:id/checks", async (request) => {
    const service = await prisma.service.findUnique({ where: { id: request.params.id } });
    if (!service) throw notFound("Service not found");

    const checks = await prisma.checkResult.findMany({
      where: { serviceId: request.params.id },
      orderBy: { checkedAt: "desc" },
      take: 100,
    });
    return { checks };
  });

  fastify.post<{ Params: { id: string } }>(
    "/:id/check",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request) => {
      const service = await prisma.service.findUnique({ where: { id: request.params.id } });
      if (!service) throw notFound("Service not found");

      await executeServiceCheck(service);

      const updated = await prisma.service.findUnique({ where: { id: request.params.id } });
      return { service: updated };
    }
  );

  fastify.get<{ Params: { id: string } }>("/:id/incidents", async (request) => {
    const service = await prisma.service.findUnique({ where: { id: request.params.id } });
    if (!service) throw notFound("Service not found");

    const incidents = await prisma.incident.findMany({
      where: { serviceId: request.params.id },
      orderBy: { startedAt: "desc" },
    });
    return { incidents };
  });

  fastify.get<{ Params: { id: string } }>("/:id/logs", async (request) => {
    const { lines: linesRaw } = request.query as { lines?: string };
    const lines = Math.min(1000, Math.max(1, Number(linesRaw) || 100));

    const service = await prisma.service.findUnique({ where: { id: request.params.id } });
    if (!service) throw notFound("Service not found");
    if (!service.serverId) throw badRequest("This service has no associated server");

    const sshParams = await loadServerSshParams(service.serverId);

    let logs: string;
    if (service.runtimeType === "DOCKER" && service.dockerContainerName) {
      logs = await getDockerLogs(sshParams, service.dockerContainerName, lines);
    } else if (service.runtimeType === "PM2" && service.pm2ProcessName) {
      logs = await getPm2Logs(sshParams, service.pm2ProcessName, lines);
    } else if (service.runtimeType === "SYSTEMD" && service.systemdUnitName) {
      logs = await getSystemdLogs(sshParams, service.systemdUnitName, lines);
    } else {
      throw badRequest("This service has no configured runtime to read logs from");
    }

    return { logs };
  });

  fastify.get<{ Params: { id: string } }>("/:id/docker/inspect", async (request) => {
    const service = await prisma.service.findUnique({ where: { id: request.params.id } });
    if (!service) throw notFound("Service not found");
    if (!service.serverId || service.runtimeType !== "DOCKER" || !service.dockerContainerName) {
      throw badRequest("This service is not mapped to a Docker container");
    }

    const sshParams = await loadServerSshParams(service.serverId);
    const details = await inspectDockerContainer(sshParams, service.dockerContainerName);
    return { details };
  });

  fastify.get<{ Params: { id: string } }>("/:id/git", async (request) => {
    const service = await prisma.service.findUnique({ where: { id: request.params.id } });
    if (!service) throw notFound("Service not found");
    if (!service.serverId || !service.workingDirectory) {
      throw badRequest("This service has no working directory configured");
    }

    const sshParams = await loadServerSshParams(service.serverId);
    const repo = await getGitInfoForDirectory(sshParams, service.workingDirectory);
    return { repo };
  });

  fastify.post<{ Params: { id: string } }>(
    "/:id/restart",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) => {
      const body = restartConfirmSchema.parse(request.body);
      const service = await prisma.service.findUnique({ where: { id: request.params.id } });
      if (!service) throw notFound("Service not found");
      if (body.confirmServiceName !== service.name) {
        throw badRequest("Confirmation name does not match service name");
      }
      if (!service.serverId) throw badRequest("This service has no associated server");

      const sshParams = await loadServerSshParams(service.serverId);
      const userId = request.user!.id;

      let outcome: { success: boolean; message: string };
      try {
        if (service.runtimeType === "DOCKER" && service.dockerContainerName) {
          outcome = await restartDockerContainer(sshParams, service.dockerContainerName);
        } else if (service.runtimeType === "PM2" && service.pm2ProcessName) {
          outcome = await restartPm2Process(sshParams, service.pm2ProcessName);
        } else if (service.runtimeType === "SYSTEMD" && service.systemdUnitName) {
          outcome = await restartSystemdUnit(sshParams, service.systemdUnitName);
        } else {
          throw badRequest("This service has no configured runtime to restart");
        }
      } catch (err) {
        await recordAuditLog({
          userId,
          serverId: service.serverId,
          serviceId: service.id,
          action: "RESTART_SERVICE",
          result: "FAILURE",
          metadata: { runtimeType: service.runtimeType, error: err instanceof ApiError ? err.message : "Unknown error" },
        });
        throw err;
      }

      await recordAuditLog({
        userId,
        serverId: service.serverId,
        serviceId: service.id,
        action: "RESTART_SERVICE",
        result: outcome.success ? "SUCCESS" : "FAILURE",
        metadata: { runtimeType: service.runtimeType, message: outcome.message },
      });

      if (service.runtimeType === "SYSTEMD" && service.systemdUnitName) {
        const status = await getSystemdStatus(sshParams, service.systemdUnitName);
        return { ...outcome, status };
      }

      return outcome;
    }
  );
};
