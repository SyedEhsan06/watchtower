import { prisma } from "@watchtower/database";
import type { Service } from "@watchtower/database";
import { runHttpCheck } from "./http-check.js";
import { runTcpCheck } from "./tcp-check.js";
import { runSshRuntimeCheck } from "./ssh-runtime-check.js";
import { computeTransition } from "./status-transition.js";
import { sendPushToAllSubscriptions } from "../push/web-push.js";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Executes a single check for a service (HTTP, TCP, or SSH_RUNTIME), then
 * applies the full pipeline: save CheckResult, update status, open/resolve
 * Incident, notify.
 */
export async function executeServiceCheck(service: Service): Promise<void> {
  let outcome;

  if (service.monitorType === "HTTP") {
    if (!service.url) return;
    outcome = await runHttpCheck({
      url: service.url,
      expectedStatusCode: service.expectedStatusCode ?? 200,
      timeoutMs: service.timeoutMs,
    });
  } else if (service.monitorType === "TCP") {
    if (!service.host || !service.port) return;
    outcome = await runTcpCheck({ host: service.host, port: service.port, timeoutMs: service.timeoutMs });
  } else if (service.monitorType === "SSH_RUNTIME") {
    const result = await runSshRuntimeCheck(service);
    if (!result) return;
    outcome = result;
  } else {
    return;
  }

  const now = new Date();
  const transition = computeTransition({
    currentStatus: service.status,
    consecutiveFailures: service.consecutiveFailures,
    failureThreshold: service.failureThreshold,
    checkPassed: outcome.status === "UP",
  });

  const nextCheckAt = new Date(now.getTime() + service.checkIntervalSeconds * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.checkResult.create({
      data: {
        serviceId: service.id,
        status: outcome.status,
        responseTimeMs: outcome.responseTimeMs,
        statusCode: outcome.statusCode,
        errorCode: outcome.errorCode,
        errorSummary: outcome.errorSummary,
        checkedAt: now,
      },
    });

    await tx.service.update({
      where: { id: service.id },
      data: {
        status: transition.nextStatus,
        consecutiveFailures: transition.nextConsecutiveFailures,
        lastCheckedAt: now,
        nextCheckAt,
      },
    });

    if (transition.becameDown) {
      await tx.incident.create({
        data: {
          serviceId: service.id,
          startedAt: now,
          initialError: outcome.errorSummary,
          latestError: outcome.errorSummary,
        },
      });
    } else if (transition.nextStatus === "DOWN") {
      // Still down: keep the open incident's latestError current.
      const openIncident = await tx.incident.findFirst({
        where: { serviceId: service.id, resolvedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (openIncident && outcome.errorSummary) {
        await tx.incident.update({
          where: { id: openIncident.id },
          data: { latestError: outcome.errorSummary },
        });
      }
    } else if (transition.recovered) {
      const openIncident = await tx.incident.findFirst({
        where: { serviceId: service.id, resolvedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (openIncident) {
        const durationSeconds = Math.round((now.getTime() - openIncident.startedAt.getTime()) / 1000);
        await tx.incident.update({
          where: { id: openIncident.id },
          data: { resolvedAt: now, durationSeconds },
        });
      }
    }
  });

  if (!service.notificationsEnabled) return;

  if (transition.becameDown) {
    await sendPushToAllSubscriptions({
      title: `${service.name} is DOWN`,
      body: `Failed ${transition.nextConsecutiveFailures} consecutive checks. ${outcome.errorSummary ?? ""}`.trim(),
    });
  } else if (transition.recovered) {
    const openIncident = await prisma.incident.findFirst({
      where: { serviceId: service.id },
      orderBy: { startedAt: "desc" },
    });
    const durationSeconds = openIncident?.durationSeconds ?? 0;
    await sendPushToAllSubscriptions({
      title: `${service.name} recovered`,
      body: `Downtime: ${formatDuration(durationSeconds)}`,
    });
  }
}
