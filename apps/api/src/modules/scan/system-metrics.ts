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

/**
 * Collects a single snapshot of system metrics over SSH using standard,
 * always-available POSIX/Linux tools (no agent installation required).
 */
export async function collectSystemMetrics(sshParams: SshConnectionParams): Promise<SystemMetrics> {
  const { result } = await withSshConnection(sshParams, async (conn) => {
    const [hostname, kernel, osRelease, uptime, loadavg, meminfo, disk, cpuInfo] = await Promise.all([
      execCommand(conn, "hostname"),
      execCommand(conn, "uname", ["-r"]),
      execCommand(conn, "cat", ["/etc/os-release"]),
      execCommand(conn, "cat", ["/proc/uptime"]),
      execCommand(conn, "cat", ["/proc/loadavg"]),
      execCommand(conn, "cat", ["/proc/meminfo"]),
      execCommand(conn, "df", ["-Pk", "/"]),
      execCommand(conn, "nproc"),
    ]);

    return {
      hostname: hostname.stdout.trim(),
      kernel: kernel.stdout.trim(),
      osRelease: osRelease.stdout,
      uptime: uptime.stdout,
      loadavg: loadavg.stdout,
      meminfo: meminfo.stdout,
      disk: disk.stdout,
      cpuCount: parseInt(cpuInfo.stdout.trim(), 10) || 1,
    };
  });

  const uptimeSeconds = Math.floor(parseFloat(result.uptime.split(" ")[0] ?? "0"));
  const loadParts = result.loadavg.trim().split(/\s+/).map(Number);
  const loadAverage: [number, number, number] = [loadParts[0] ?? 0, loadParts[1] ?? 0, loadParts[2] ?? 0];

  const memTotal = parseMemInfoField(result.meminfo, "MemTotal");
  const memAvailable = parseMemInfoField(result.meminfo, "MemAvailable");
  const memoryTotalMb = Math.round(memTotal / 1024);
  const memoryAvailableMb = Math.round(memAvailable / 1024);
  const memoryUsedMb = memoryTotalMb - memoryAvailableMb;

  const diskLine = result.disk.trim().split("\n")[1]?.trim().split(/\s+/) ?? [];
  const diskTotalMb = Math.round(parseInt(diskLine[1] ?? "0", 10) / 1024);
  const diskUsedMb = Math.round(parseInt(diskLine[2] ?? "0", 10) / 1024);
  const diskAvailableMb = Math.round(parseInt(diskLine[3] ?? "0", 10) / 1024);

  const osMatch = result.osRelease.match(/^PRETTY_NAME="?([^"\n]+)"?/m);

  return {
    hostname: result.hostname,
    os: osMatch?.[1] ?? null,
    kernel: result.kernel,
    uptimeSeconds,
    cpuCount: result.cpuCount,
    cpuUsagePercent: loadAverage[0] != null ? Math.min(100, Math.round((loadAverage[0] / result.cpuCount) * 100)) : null,
    loadAverage,
    memoryTotalMb,
    memoryUsedMb,
    memoryAvailableMb,
    diskTotalMb,
    diskUsedMb,
    diskAvailableMb,
    collectedAt: new Date().toISOString(),
  };
}

function parseMemInfoField(meminfo: string, field: string): number {
  const match = meminfo.match(new RegExp(`^${field}:\\s+(\\d+)`, "m"));
  return match ? parseInt(match[1]!, 10) : 0;
}
