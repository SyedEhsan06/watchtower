import { prisma } from "@watchtower/database";
import type { Server } from "@watchtower/database";
import { loadServerSshParams } from "../ssh/server-credentials.js";
import { withSshConnection, execCommand } from "../ssh/ssh-client.js";
import { collectSystemMetricsOn } from "./system-metrics.js";
import { listDockerContainersOn } from "../docker/docker.js";
import { listPm2ProcessesOn } from "../pm2/pm2.js";
import { discoverGitRepositoriesOn } from "../git/git.js";
import { rememberLiveSnapshots } from "./live-snapshots.js";
import { ApiError } from "../../utils/errors.js";

export interface ScanResult {
  system: Awaited<ReturnType<typeof collectSystemMetricsOn>>;
  docker: {
    available: boolean;
    containers: Awaited<ReturnType<typeof listDockerContainersOn>>;
  };
  pm2: {
    available: boolean;
    processes: Awaited<ReturnType<typeof listPm2ProcessesOn>>;
  };
  repositories: Awaited<ReturnType<typeof discoverGitRepositoriesOn>>;
}

export async function scanServer(server: Server): Promise<ScanResult> {
  const sshParams = await loadServerSshParams(server.id);

  try {
    const { result } = await withSshConnection(sshParams, async (conn) => {
      const [
        system,
        dockerWhich,
        containers,
        pm2Which,
        processes,
        repositories,
      ] = await Promise.all([
        collectSystemMetricsOn(conn),
        execCommand(conn, "which", ["docker"]).then(
          (check) => check.code === 0,
        ),
        listDockerContainersOn(conn),
        execCommand(conn, "which", ["pm2"]).then((check) => check.code === 0),
        listPm2ProcessesOn(conn),
        server.projectDirectories.length > 0
          ? discoverGitRepositoriesOn(conn, server.projectDirectories)
          : Promise.resolve([]),
      ]);

      return {
        system,
        dockerAvailable: dockerWhich,
        containers,
        pm2Available: pm2Which,
        processes,
        repositories,
      };
    });

    await prisma.server.update({
      where: { id: server.id },
      data: {
        connectionStatus: "ONLINE",
        lastConnectedAt: new Date(),
        lastConnectionError: null,
      },
    });

    rememberLiveSnapshots(server.id, {
      metrics: result.system,
      containers: result.containers,
      processes: result.processes,
      repositories: result.repositories,
    });

    return {
      system: result.system,
      docker: {
        available: result.dockerAvailable,
        containers: result.containers,
      },
      pm2: { available: result.pm2Available, processes: result.processes },
      repositories: result.repositories,
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
