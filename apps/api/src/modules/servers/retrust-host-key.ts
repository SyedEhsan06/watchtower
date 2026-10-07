import { prisma } from "@watchtower/database";
import { recordAuditLog } from "../audit/audit-log.js";

/**
 * Clears the stored SSH host key fingerprint so the next connection re-trusts
 * whatever key the server presents (trust-on-first-connect again). Audited.
 */
export async function retrustHostKey(params: {
  serverId: string;
  workspaceId: string;
  userId: string;
}): Promise<{ cleared: boolean; previousFingerprint: string | null } | null> {
  const server = await prisma.server.findFirst({
    where: { id: params.serverId, workspaceId: params.workspaceId },
    select: { id: true, sshHostKeyFingerprint: true },
  });
  if (!server) return null;

  await prisma.server.update({
    where: { id: server.id },
    data: { sshHostKeyFingerprint: null },
  });

  await recordAuditLog({
    userId: params.userId,
    workspaceId: params.workspaceId,
    serverId: server.id,
    action: "server.host_key.retrust",
    result: "SUCCESS",
    metadata: { previousFingerprint: server.sshHostKeyFingerprint },
  });

  return { cleared: true, previousFingerprint: server.sshHostKeyFingerprint };
}
