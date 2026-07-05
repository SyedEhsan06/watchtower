import { prisma } from "@watchtower/database";
import { executeServiceCheck } from "../monitoring/run-check.js";
import { createLimiter } from "./concurrency-limit.js";

const TICK_INTERVAL_MS = 10_000;
const BATCH_SIZE = 20;
const MAX_CONCURRENCY = 5;

/**
 * In-process monitoring scheduler. Assumes exactly one Fastify instance is
 * running — the in-memory `inFlight` set is not shared across processes, so
 * running multiple API instances would allow the same service to be checked
 * concurrently by different instances. Fine for this single-operator tool;
 * would need a DB-backed lock (e.g. SELECT ... FOR UPDATE SKIP LOCKED) to
 * safely scale beyond one instance.
 */
export function startScheduler(logger: { error: (obj: unknown, msg?: string) => void }) {
  const inFlight = new Set<string>();
  const limit = createLimiter(MAX_CONCURRENCY);

  const interval = setInterval(async () => {
    try {
      const dueServices = await prisma.service.findMany({
        where: {
          nextCheckAt: { lte: new Date() },
          monitorType: { in: ["HTTP", "TCP", "SSH_RUNTIME"] },
          id: { notIn: Array.from(inFlight) },
        },
        orderBy: { nextCheckAt: "asc" },
        take: BATCH_SIZE,
      });

      for (const service of dueServices) {
        inFlight.add(service.id);
        limit(() => executeServiceCheck(service))
          .catch((err) => logger.error({ err, serviceId: service.id }, "Scheduled check failed"))
          .finally(() => inFlight.delete(service.id));
      }
    } catch (err) {
      logger.error({ err }, "Scheduler tick failed");
    }
  }, TICK_INTERVAL_MS);

  return () => clearInterval(interval);
}
