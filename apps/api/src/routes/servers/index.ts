import type { FastifyPluginAsync } from "fastify";
import { createServerSchema, updateServerSchema, testConnectionSchema, createApiKeySchema } from "@watchtower/shared";
import { prisma } from "@watchtower/database";
import { notFound, ApiError } from "../../utils/errors.js";
import { serverPublicSelect } from "../../modules/servers/select.js";
import { encryptSecret } from "../../modules/crypto/secret-box.js";
import { loadMasterEncryptionKey } from "../../modules/crypto/master-key.js";
import { testSshConnection } from "../../modules/ssh/test-connection.js";
import { loadServerSshParams } from "../../modules/ssh/server-credentials.js";
import { scanServer } from "../../modules/scan/scan-server.js";
import { createApiKey } from "../../modules/auth/api-key.js";

export const serverRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async () => {
    const servers = await prisma.server.findMany({
      select: { ...serverPublicSelect, _count: { select: { services: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { servers };
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (request) => {
    const server = await prisma.server.findUnique({
      where: { id: request.params.id },
      select: serverPublicSelect,
    });
    if (!server) throw notFound("Server not found");
    return { server };
  });

  // Ad-hoc test before a server is ever saved. Never persists anything.
  fastify.post(
    "/test-connection",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request) => {
      const body = testConnectionSchema.parse(request.body);
      const result = await testSshConnection({
        host: body.host,
        port: body.sshPort,
        username: body.sshUsername,
        privateKey: body.sshPrivateKey,
      });
      return result;
    }
  );

  fastify.post("/", async (request, reply) => {
    const body = createServerSchema.parse(request.body);
    const { sshPrivateKey, ...rest } = body;

    let encryptedFields: { encryptedSshPrivateKey: string; sshKeyIv: string; sshKeyAuthTag: string } | undefined;
    if (sshPrivateKey) {
      const masterKey = loadMasterEncryptionKey();
      const encrypted = encryptSecret(sshPrivateKey, masterKey);
      encryptedFields = {
        encryptedSshPrivateKey: encrypted.ciphertext,
        sshKeyIv: encrypted.iv,
        sshKeyAuthTag: encrypted.authTag,
      };
    }

    const server = await prisma.server.create({
      data: { ...rest, ...encryptedFields },
      select: serverPublicSelect,
    });

    reply.status(201);
    return { server };
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const body = updateServerSchema.parse(request.body);
    const { sshPrivateKey, ...rest } = body;

    const existing = await prisma.server.findUnique({ where: { id: request.params.id } });
    if (!existing) throw notFound("Server not found");

    let encryptedFields: { encryptedSshPrivateKey: string; sshKeyIv: string; sshKeyAuthTag: string } | undefined;
    if (sshPrivateKey) {
      const masterKey = loadMasterEncryptionKey();
      const encrypted = encryptSecret(sshPrivateKey, masterKey);
      encryptedFields = {
        encryptedSshPrivateKey: encrypted.ciphertext,
        sshKeyIv: encrypted.iv,
        sshKeyAuthTag: encrypted.authTag,
      };
    }

    const server = await prisma.server.update({
      where: { id: request.params.id },
      data: { ...rest, ...encryptedFields },
      select: serverPublicSelect,
    });
    return { server };
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const existing = await prisma.server.findUnique({ where: { id: request.params.id } });
    if (!existing) throw notFound("Server not found");

    await prisma.server.delete({ where: { id: request.params.id } });
    reply.status(204);
  });

  // Tests the connection to an already-saved server, using its stored (encrypted) credentials.
  fastify.post<{ Params: { id: string } }>(
    "/:id/test",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request) => {
      const server = await prisma.server.findUnique({ where: { id: request.params.id } });
      if (!server) throw notFound("Server not found");

      const sshParams = await loadServerSshParams(request.params.id);

      try {
        const result = await testSshConnection(sshParams);
        await prisma.server.update({
          where: { id: request.params.id },
          data: {
            connectionStatus: "ONLINE",
            lastConnectedAt: new Date(),
            lastConnectionError: null,
            sshHostKeyFingerprint: result.hostKeyFingerprint,
          },
        });
        return result;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Connection failed";
        await prisma.server.update({
          where: { id: request.params.id },
          data: { connectionStatus: "OFFLINE", lastConnectionError: message },
        });
        throw err;
      }
    }
  );

  fastify.post<{ Params: { id: string } }>(
    "/:id/scan",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) => {
      const server = await prisma.server.findUnique({ where: { id: request.params.id } });
      if (!server) throw notFound("Server not found");

      return scanServer(server);
    }
  );

  fastify.get<{ Params: { id: string } }>("/:id/metrics", async (request) => {
    const server = await prisma.server.findUnique({ where: { id: request.params.id } });
    if (!server) throw notFound("Server not found");

    const { collectSystemMetrics } = await import("../../modules/scan/system-metrics.js");
    const sshParams = await loadServerSshParams(request.params.id);
    const metrics = await collectSystemMetrics(sshParams);
    return { metrics };
  });

  fastify.get<{ Params: { id: string } }>("/:id/docker", async (request) => {
    const server = await prisma.server.findUnique({ where: { id: request.params.id } });
    if (!server) throw notFound("Server not found");

    const { listDockerContainers } = await import("../../modules/docker/docker.js");
    const sshParams = await loadServerSshParams(request.params.id);
    const containers = await listDockerContainers(sshParams);
    return { containers };
  });

  fastify.get<{ Params: { id: string } }>("/:id/pm2", async (request) => {
    const server = await prisma.server.findUnique({ where: { id: request.params.id } });
    if (!server) throw notFound("Server not found");

    const { listPm2Processes } = await import("../../modules/pm2/pm2.js");
    const sshParams = await loadServerSshParams(request.params.id);
    const processes = await listPm2Processes(sshParams);
    return { processes };
  });

  // --- API key management (session-auth only; the keys these mint are what
  // unlocks the parallel /external/servers/:id/* routes for machine callers). ---

  fastify.post<{ Params: { id: string } }>("/:id/api-keys", async (request, reply) => {
    const server = await prisma.server.findUnique({ where: { id: request.params.id } });
    if (!server) throw notFound("Server not found");

    const body = createApiKeySchema.parse(request.body);
    const created = await createApiKey({
      name: body.name,
      serverId: request.params.id,
      createdByUserId: request.user!.id,
    });

    reply.status(201);
    // plaintextKey is returned ONLY here, this one time. It is never stored
    // or retrievable again after this response.
    return { apiKey: created };
  });

  fastify.get<{ Params: { id: string } }>("/:id/api-keys", async (request) => {
    const server = await prisma.server.findUnique({ where: { id: request.params.id } });
    if (!server) throw notFound("Server not found");

    const keys = await prisma.apiKey.findMany({
      where: { serverId: request.params.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { apiKeys: keys };
  });

  fastify.delete<{ Params: { id: string; keyId: string } }>("/:id/api-keys/:keyId", async (request, reply) => {
    const key = await prisma.apiKey.findUnique({ where: { id: request.params.keyId } });
    if (!key || key.serverId !== request.params.id) throw notFound("API key not found");

    if (!key.revokedAt) {
      await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    }
    reply.status(204);
  });
};
