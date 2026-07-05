import { prisma } from "@watchtower/database";
import type { Server } from "@watchtower/database";
import { loadServerSshParams } from "../ssh/server-credentials.js";
import { collectSystemMetrics } from "./system-metrics.js";
import { isDockerAvailable, listDockerContainers } from "../docker/docker.js";
import { isPm2Available, listPm2Processes } from "../pm2/pm2.js";
import { discoverGitRepositories } from "../git/git.js";
import { ApiError } from "../../utils/errors.js";

export interface ScanResult {
  system: Awaited<ReturnType<typeof collectSystemMetrics>>;
  docker: { available: boolean; containers: Awaited<ReturnType<typeof listDockerContainers>> };
  pm2: { available: boolean; processes: Awaited<ReturnType<typeof listPm2Processes>> };
  repositories: Awaited<ReturnType<typeof discoverGitRepositories>>;
}

export async function scanServer(server: Server): Promise<ScanResult> {
  const sshParams = await loadServerSshParams(server.id);

  try {
    const system = await collectSystemMetrics(sshParams);

    const dockerAvailable = await isDockerAvailable(sshParams);
    const containers = dockerAvailable ? await listDockerContainers(sshParams) : [];

    const pm2Available = await isPm2Available(sshParams);
    const processes = pm2Available ? await listPm2Processes(sshParams) : [];

    const repositories = server.projectDirectories.length
      ? await discoverGitRepositories(sshParams, server.projectDirectories)
      : [];

    await prisma.server.update({
      where: { id: server.id },
      data: { connectionStatus: "ONLINE", lastConnectedAt: new Date(), lastConnectionError: null },
    });

    return {
      system,
      docker: { available: dockerAvailable, containers },
      pm2: { available: pm2Available, processes },
      repositories,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Scan failed";
    await prisma.server.update({
      where: { id: server.id },
      data: { connectionStatus: "OFFLINE", lastConnectionError: message },
    });
    throw err;
  }
}
