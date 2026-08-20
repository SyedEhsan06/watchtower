import type { Client as SshClient } from "ssh2";
import { withSshConnection, execCommand } from "../ssh/ssh-client.js";
import type { SshConnectionParams } from "../ssh/ssh-client.js";
import { isSafeIdentifier } from "@watchtower/shared";
import { ApiError } from "../../utils/errors.js";

export interface Pm2Process {
  name: string;
  pm2Id: number;
  status: string;
  pid: number | null;
  cpuPercent: number;
  memoryMb: number;
  restarts: number;
  uptimeMs: number | null;
}

interface Pm2JlistEntry {
  name: string;
  pm_id: number;
  pid: number;
  monit: { cpu: number; memory: number };
  pm2_env: { status: string; restart_time: number; pm_uptime: number };
}

export async function isPm2Available(
  sshParams: SshConnectionParams,
): Promise<boolean> {
  const { result } = await withSshConnection(sshParams, async (conn) => {
    const check = await execCommand(conn, "which", ["pm2"]);
    return check.code === 0;
  });
  return result;
}

export async function listPm2ProcessesOn(
  conn: SshClient,
): Promise<Pm2Process[]> {
  const result = await execCommand(conn, "pm2", ["jlist"]);
  if (result.code !== 0) return [];

  let parsed: Pm2JlistEntry[];
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return [];
  }

  const now = Date.now();
  return parsed.map((entry) => ({
    name: entry.name,
    pm2Id: entry.pm_id,
    status: entry.pm2_env.status,
    pid: entry.pid || null,
    cpuPercent: entry.monit?.cpu ?? 0,
    memoryMb: Math.round((entry.monit?.memory ?? 0) / (1024 * 1024)),
    restarts: entry.pm2_env.restart_time ?? 0,
    uptimeMs: entry.pm2_env.pm_uptime ? now - entry.pm2_env.pm_uptime : null,
  }));
}

export async function listPm2Processes(
  sshParams: SshConnectionParams,
): Promise<Pm2Process[]> {
  const { result } = await withSshConnection(sshParams, listPm2ProcessesOn);
  return result;
}

export async function getPm2Logs(
  sshParams: SshConnectionParams,
  processName: string,
  lines: number,
): Promise<string> {
  if (!isSafeIdentifier(processName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid process name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "pm2", [
      "logs",
      processName,
      "--lines",
      String(lines),
      "--nostream",
    ]);
  });

  return `${result.stdout}${result.stderr}`;
}

export async function restartPm2Process(
  sshParams: SshConnectionParams,
  processName: string,
): Promise<{ success: boolean; message: string }> {
  if (!isSafeIdentifier(processName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid process name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "pm2", ["restart", processName]);
  });

  if (result.code !== 0) {
    return {
      success: false,
      message: result.stderr.trim() || "Restart failed",
    };
  }
  return { success: true, message: "Process restarted" };
}
