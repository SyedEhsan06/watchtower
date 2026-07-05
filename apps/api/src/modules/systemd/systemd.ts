import { withSshConnection, execCommand } from "../ssh/ssh-client.js";
import type { SshConnectionParams } from "../ssh/ssh-client.js";
import { isSafeSystemdUnit } from "@watchtower/shared";
import { ApiError } from "../../utils/errors.js";

export async function getSystemdStatus(sshParams: SshConnectionParams, unitName: string): Promise<string> {
  if (!isSafeSystemdUnit(unitName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid unit name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "systemctl", ["is-active", unitName]);
  });

  return result.stdout.trim() || "unknown";
}

export async function getSystemdLogs(
  sshParams: SshConnectionParams,
  unitName: string,
  lines: number
): Promise<string> {
  if (!isSafeSystemdUnit(unitName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid unit name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "journalctl", ["-u", unitName, "-n", String(lines), "--no-pager"]);
  });

  return `${result.stdout}${result.stderr}`;
}

export async function restartSystemdUnit(
  sshParams: SshConnectionParams,
  unitName: string
): Promise<{ success: boolean; message: string }> {
  if (!isSafeSystemdUnit(unitName)) {
    throw new ApiError("INVALID_IDENTIFIER", "Invalid unit name", 400);
  }

  const { result } = await withSshConnection(sshParams, async (conn) => {
    return execCommand(conn, "sudo", ["systemctl", "restart", unitName]);
  });

  if (result.code !== 0) {
    return { success: false, message: result.stderr.trim() || "Restart failed" };
  }
  return { success: true, message: "Unit restarted" };
}
