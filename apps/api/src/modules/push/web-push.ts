import webpush from "web-push";
import { prisma } from "@watchtower/database";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return; // push not configured yet; silently no-op (Phase 6 setup step)
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendPushToAllSubscriptions(payload: {
  title: string;
  body: string;
}): Promise<void> {
  ensureConfigured();
  if (!configured) return;

  const subscriptions = await prisma.pushSubscription.findMany();
  const message = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 means the subscription is gone (browser unsubscribed, uninstalled, etc).
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
    })
  );
}

export function isPushConfigured(): boolean {
  ensureConfigured();
  return configured;
}
