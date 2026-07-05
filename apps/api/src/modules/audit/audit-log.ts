import { prisma, Prisma } from "@watchtower/database";

export async function recordAuditLog(entry: {
  userId: string;
  serverId?: string;
  serviceId?: string;
  action: string;
  result: "SUCCESS" | "FAILURE";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      serverId: entry.serverId,
      serviceId: entry.serviceId,
      action: entry.action,
      result: entry.result,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
