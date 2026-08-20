import type { Client as SshClient } from "ssh2";
import { withSshConnection, execCommand } from "../ssh/ssh-client.js";
import type { SshConnectionParams } from "../ssh/ssh-client.js";
import { isSafeIdentifier } from "@watchtower/shared";
import { ApiError } from "../../utils/errors.js";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string;
  ports: string;
  restartCount: number | null;
}

interface DockerPsLine {
  ID: string;
  Names: string;
  Image: string;
  State: string;
  Status: string;
  CreatedAt: string;
  Ports: string;
}

export async function isDockerAvailable(
  sshParams: SshConnectionParams,
): Promise<boolean> {
  const { result } = await withSshConnection(sshParams, async (conn) => {
    const check = await execCommand(conn, "which", ["docker"]);
    return check.code === 0;
  });
  return result;
}

export async function listDockerContainersOn(
  conn: SshClient,
): Promise<DockerContainer[]> {
  const result = await execCommand(conn, "docker", [
    "ps",
    "--all",
    "--format",
    "{{json .}}",
  ]);

  if (result.code !== 0) {
    if (/permission denied/i.test(result.stderr)) {
      throw new ApiError(
        "SSH_CONNECTION_FAILED",
        "Docker socket access denied — the SSH user needs to be in the docker group",
        502,
      );
    }
    return [];
  }

  return result.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const parsed: DockerPsLine = JSON.parse(line);
        return [
          {
            id: parsed.ID,
            name: parsed.Names,
            image: parsed.Image,
            state: parsed.State,
            status: parsed.Status,
            createdAt: parsed.CreatedAt,
            ports: parsed.Ports,
            restartCount: null,
          },
        ];
      } catch {
        return [];
      }
    });
}

export async function listDockerContainers(
  sshParams: SshConnectionParams,
): Promise<DockerContainer[]> {
  const { result } = await withSshConnection(sshParams, listDockerContainersOn);
  return result;
}

export async function inspectDockerContainer(
  sshParams: SshConnectionParams,
  containerName: string,
) {
  if (!isSafeIdentifier(containerName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid container name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "docker", ["inspect", containerName]);
  });

  if (result.code !== 0) {
    throw new ApiError("NOT_FOUND", "Container not found", 404);
  }

  const [inspected] = JSON.parse(result.stdout);
  return {
    id: inspected.Id,
    name: inspected.Name?.replace(/^\//, ""),
    image: inspected.Config?.Image,
    state: inspected.State?.Status,
    startedAt: inspected.State?.StartedAt,
    restartCount: inspected.RestartCount ?? 0,
    ports: inspected.NetworkSettings?.Ports ?? {},
  };
}

export async function getDockerLogs(
  sshParams: SshConnectionParams,
  containerName: string,
  lines: number,
): Promise<string> {
  if (!isSafeIdentifier(containerName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid container name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "docker", [
      "logs",
      "--tail",
      String(lines),
      containerName,
    ]);
  });

  return `${result.stdout}${result.stderr}`;
}

export async function restartDockerContainer(
  sshParams: SshConnectionParams,
  containerName: string,
): Promise<{ success: boolean; message: string }> {
  if (!isSafeIdentifier(containerName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid container name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "docker", ["restart", containerName]);
  });

  if (result.code !== 0) {
    return {
      success: false,
      message: result.stderr.trim() || "Restart failed",
    };
  }
  return { success: true, message: "Container restarted" };
}
