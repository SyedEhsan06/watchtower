import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@watchtower/database";
import { notFound } from "../../utils/errors.js";
import { serverPublicSelect } from "../../modules/servers/select.js";
import { loadServerSshParams } from "../../modules/ssh/server-credentials.js";

/**
 * Routes for external machine-to-machine callers (e.g. a separate app
 * polling for health data), authenticated via API key rather than the
 * session cookie used by Watchtower's own web UI. Kept under a distinct
 * `/external` prefix — deliberately separate route registrations from
 * `serverRoutes`/`incidentRoutes` rather than layering a second preHandler
 * onto the session-authed routes, so the two auth mechanisms and their
 * scoping rules never have to be reasoned about in the same handler.
 *
 * Every handler here must confirm `request.apiKeyServerId` matches the
 * `:id` in the URL before returning anything. A key for Server A must 404
 * (not 403) when used against Server B — same "don't leak existence"
 * pattern as the rest of this API.
 */
export const externalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.requireApiKey);

  fastify.addHook("preHandler", async (request) => {
    const { id } = request.params as { id?: string };
    if (id && request.apiKeyServerId !== id) {
      throw notFound("Server not found");
    }
  });

  fastify.get<{ Params: { id: string } }>("/servers/:id", async (request) => {
    const server = await prisma.server.findUnique({
      where: { id: request.params.id, workspaceId: request.apiKeyWorkspaceId! },
      select: serverPublicSelect,
    });
    if (!server) throw notFound("Server not found");
    return { server };
  });

  fastify.get<{ Params: { id: string } }>("/servers/:id/metrics", async (request) => {
    const server = await prisma.server.findFirst({ where: { id: request.params.id, workspaceId: request.apiKeyWorkspaceId! } });
    if (!server) throw notFound("Server not found");

    const { collectSystemMetrics } = await import("../../modules/scan/system-metrics.js");
    const sshParams = await loadServerSshParams(request.params.id);
    const metrics = await collectSystemMetrics(sshParams);
    return { metrics };
  });

  fastify.get<{ Params: { id: string } }>("/servers/:id/docker", async (request) => {
    const server = await prisma.server.findFirst({ where: { id: request.params.id, workspaceId: request.apiKeyWorkspaceId! } });
    if (!server) throw notFound("Server not found");

    const { listDockerContainers } = await import("../../modules/docker/docker.js");
    const sshParams = await loadServerSshParams(request.params.id);
    const containers = await listDockerContainers(sshParams);
    return { containers };
  });

  fastify.get<{ Params: { id: string } }>("/servers/:id/pm2", async (request) => {
    const server = await prisma.server.findFirst({ where: { id: request.params.id, workspaceId: request.apiKeyWorkspaceId! } });
    if (!server) throw notFound("Server not found");

    const { listPm2Processes } = await import("../../modules/pm2/pm2.js");
    const sshParams = await loadServerSshParams(request.params.id);
    const processes = await listPm2Processes(sshParams);
    return { processes };
  });

  fastify.get<{ Params: { id: string } }>("/servers/:id/incidents", async (request) => {
    const server = await prisma.server.findFirst({ where: { id: request.params.id, workspaceId: request.apiKeyWorkspaceId! } });
    if (!server) throw notFound("Server not found");

    const incidents = await prisma.incident.findMany({
      where: { workspaceId: request.apiKeyWorkspaceId!, service: { serverId: request.params.id, workspaceId: request.apiKeyWorkspaceId! } },
      include: { service: { select: { id: true, name: true, serverId: true } } },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return { incidents };
  });
};
