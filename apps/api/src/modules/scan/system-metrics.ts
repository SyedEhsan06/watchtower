import type { Client as SshClient } from "ssh2";
import { withSshConnection, execCommand } from "../ssh/ssh-client.js";
import type { SshConnectionParams } from "../ssh/ssh-client.js";

export interface SystemMetrics {
  hostname: string;
  os: string | null;
  kernel: string;
  uptimeSeconds: number;
  cpuCount: number;
  cpuUsagePercent: number | null;
  loadAverage: [number, number, number];
  memoryTotalMb: number;
  memoryUsedMb: number;
  memoryAvailableMb: number;
  diskTotalMb: number;
  diskUsedMb: number;
  diskAvailableMb: number;
  collectedAt: string;
}

const METRICS_DELIMITER = "__WATCHTOWER_FS__";

/**
 * One remote script instead of eight SSH execs. Handshake cost dominates,
 * but each extra channel still adds round-trips on a high-latency Azure SSH.
 */
const METRICS_SCRIPT = [
  "hostname",
  "uname -r",
  "nproc",
  "cat /proc/uptime",
  "cat /proc/loadavg",
  "cat /proc/meminfo",
  "df -Pk /",
  "cat /etc/os-release",
].join(`; echo ${METRICS_DELIMITER}; `);

export function parseSystemMetricsOutput(
  stdout: string,
  collectedAt = new Date().toISOString(),
): SystemMetrics {
  const parts = stdout.split(METRICS_DELIMITER).map((part) => part.trim());
  const hostname = parts[0] ?? "";
  const kernel = parts[1] ?? "";
  const cpuCount = parseInt(parts[2] ?? "1", 10) || 1;
  const uptime = parts[3] ?? "";
  const loadavg = parts[4] ?? "";
  const meminfo = parts[5] ?? "";
  const disk = parts[6] ?? "";
  const osRelease = parts[7] ?? "";

  const uptimeSeconds = Math.floor(parseFloat(uptime.split(" ")[0] ?? "0"));
  const loadParts = loadavg.trim().split(/\s+/).map(Number);
  const loadAverage: [number, number, number] = [
    loadParts[0] ?? 0,
    loadParts[1] ?? 0,
    loadParts[2] ?? 0,
  ];

  const memTotal = parseMemInfoField(meminfo, "MemTotal");
  const memAvailable = parseMemInfoField(meminfo, "MemAvailable");
  const memoryTotalMb = Math.round(memTotal / 1024);
  const memoryAvailableMb = Math.round(memAvailable / 1024);
  const memoryUsedMb = memoryTotalMb - memoryAvailableMb;

  const diskLine = disk.trim().split("\n")[1]?.trim().split(/\s+/) ?? [];
  const diskTotalMb = Math.round(parseInt(diskLine[1] ?? "0", 10) / 1024);
  const diskUsedMb = Math.round(parseInt(diskLine[2] ?? "0", 10) / 1024);
  const diskAvailableMb = Math.round(parseInt(diskLine[3] ?? "0", 10) / 1024);

  const osMatch = osRelease.match(/^PRETTY_NAME="?([^"\n]+)"?/m);

  return {
    hostname,
    os: osMatch?.[1] ?? null,
    kernel,
    uptimeSeconds,
    cpuCount,
    cpuUsagePercent:
      loadAverage[0] != null
        ? Math.min(100, Math.round((loadAverage[0] / cpuCount) * 100))
        : null,
    loadAverage,
    memoryTotalMb,
    memoryUsedMb,
    memoryAvailableMb,
    diskTotalMb,
    diskUsedMb,
    diskAvailableMb,
    collectedAt,
  };
}

export async function collectSystemMetricsOn(
  conn: SshClient,
): Promise<SystemMetrics> {
  const result = await execCommand(conn, "sh", ["-c", METRICS_SCRIPT]);
  return parseSystemMetricsOutput(result.stdout);
}

/**
 * Collects a single snapshot of system metrics over SSH using standard,
 * always-available POSIX/Linux tools (no agent installation required).
 */
export async function collectSystemMetrics(
  sshParams: SshConnectionParams,
): Promise<SystemMetrics> {
  const { result } = await withSshConnection(sshParams, collectSystemMetricsOn);
  return result;
}

function parseMemInfoField(meminfo: string, field: string): number {
  const match = meminfo.match(new RegExp(`^${field}:\\s+(\\d+)`, "m"));
  return match ? parseInt(match[1]!, 10) : 0;
}
