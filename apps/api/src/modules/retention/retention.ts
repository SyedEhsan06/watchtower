import { prisma } from "@watchtower/database";

const RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly

/** Deletes CheckResult rows older than the retention window. Incidents are never auto-deleted. */
export function startRetentionJob(logger: { error: (obj: unknown, msg?: string) => void }) {
  async function cleanup() {
    try {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      await prisma.checkResult.deleteMany({ where: { checkedAt: { lt: cutoff } } });
    } catch (err) {
      logger.error({ err }, "Retention cleanup failed");
    }
  }

  void cleanup();
  const interval = setInterval(cleanup, CLEANUP_INTERVAL_MS);
  return () => clearInterval(interval);
}
