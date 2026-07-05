import type { Service } from "@watchtower/database";
import type { CheckOutcome } from "./http-check.js";
import { loadServerSshParams } from "../ssh/server-credentials.js";
import { withSshConnection, execCommand } from "../ssh/ssh-client.js";
import { isSafeIdentifier, isSafeSystemdUnit } from "@watchtower/shared";

/**
 * Checks the live state of a Docker container, PM2 process, or systemd unit
 * over SSH. Used by the scheduler to poll SSH_RUNTIME services the same way
 * HTTP/TCP services are polled, just with a different transport.
 */
export async function runSshRuntimeCheck(service: Service): Promise<CheckOutcome | null> {
  if (!service.serverId) return null;

  const started = performance.now();

  try {
    const sshParams = await loadServerSshParams(service.serverId);

    if (service.runtimeType === "DOCKER" && service.dockerContainerName) {
      if (!isSafeIdentifier(service.dockerContainerName)) return null;
      const { result } = await withSshConnection(sshParams, (conn) =>
        execCommand(conn, "docker", ["inspect", "--format", "{{.State.Status}}", service.dockerContainerName!])
      );
      const responseTimeMs = Math.round(performance.now() - started);
      const state = result.stdout.trim();

      if (result.code !== 0) {
        return {
          status: "DOWN",
          responseTimeMs,
          statusCode: null,
          errorCode: "CONTAINER_NOT_FOUND",
          errorSummary: result.stderr.trim() || "Container not found",
        };
      }
      return state === "running"
        ? { status: "UP", responseTimeMs, statusCode: null, errorCode: null, errorSummary: null }
        : { status: "DOWN", responseTimeMs, statusCode: null, errorCode: "CONTAINER_NOT_RUNNING", errorSummary: `Container state: ${state}` };
    }

    if (service.runtimeType === "PM2" && service.pm2ProcessName) {
      if (!isSafeIdentifier(service.pm2ProcessName)) return null;
      const { result } = await withSshConnection(sshParams, (conn) => execCommand(conn, "pm2", ["jlist"]));
      const responseTimeMs = Math.round(performance.now() - started);

      let processes: Array<{ name: string; pm2_env: { status: string } }>;
      try {
        processes = JSON.parse(result.stdout);
      } catch {
        return { status: "DOWN", responseTimeMs, statusCode: null, errorCode: "PM2_UNAVAILABLE", errorSummary: "Could not read pm2 process list" };
      }

      const proc = processes.find((p) => p.name === service.pm2ProcessName);
      if (!proc) {
        return { status: "DOWN", responseTimeMs, statusCode: null, errorCode: "PROCESS_NOT_FOUND", errorSummary: "PM2 process not found" };
      }
      return proc.pm2_env.status === "online"
        ? { status: "UP", responseTimeMs, statusCode: null, errorCode: null, errorSummary: null }
        : { status: "DOWN", responseTimeMs, statusCode: null, errorCode: "PROCESS_NOT_ONLINE", errorSummary: `Process status: ${proc.pm2_env.status}` };
    }

    if (service.runtimeType === "SYSTEMD" && service.systemdUnitName) {
      if (!isSafeSystemdUnit(service.systemdUnitName)) return null;
      const { result } = await withSshConnection(sshParams, (conn) =>
        execCommand(conn, "systemctl", ["is-active", service.systemdUnitName!])
      );
      const responseTimeMs = Math.round(performance.now() - started);
      const state = result.stdout.trim();

      return state === "active"
        ? { status: "UP", responseTimeMs, statusCode: null, errorCode: null, errorSummary: null }
        : { status: "DOWN", responseTimeMs, statusCode: null, errorCode: "UNIT_NOT_ACTIVE", errorSummary: `Unit state: ${state}` };
    }

    return null;
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - started);
    return {
      status: "DOWN",
      responseTimeMs,
      statusCode: null,
      errorCode: "SSH_CONNECTION_FAILED",
      errorSummary: err instanceof Error ? err.message : "SSH connection failed",
    };
  }
}
