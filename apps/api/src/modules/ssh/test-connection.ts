import { withSshConnection, execCommand } from "./ssh-client.js";
import type { SshConnectionParams } from "./ssh-client.js";

export interface TestConnectionResult {
  success: true;
  hostname: string;
  osInfo: string | null;
  hostKeyFingerprint: string;
}

export async function testSshConnection(params: SshConnectionParams): Promise<TestConnectionResult> {
  const { result, hostKeyFingerprint } = await withSshConnection(params, async (conn) => {
    const hostnameResult = await execCommand(conn, "hostname");
    const osResult = await execCommand(conn, "cat", ["/etc/os-release"]);
    return {
      hostname: hostnameResult.stdout.trim(),
      osInfo: parseOsRelease(osResult.stdout),
    };
  });

  return {
    success: true,
    hostname: result.hostname,
    osInfo: result.osInfo,
    hostKeyFingerprint,
  };
}

function parseOsRelease(content: string): string | null {
  const match = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
  return match?.[1] ?? null;
}
