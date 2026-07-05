"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { getPushSubscription, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

type Status = "loading" | "unsupported" | "enabled" | "disabled";

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    getPushSubscription()
      .then((sub) => setStatus(sub ? "enabled" : "disabled"))
      .catch(() => setStatus("disabled"));
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const subscription = await subscribeToPush();
      const json = subscription.toJSON();
      await apiClientFetch("/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus("enabled");
      toast.success("Push notifications enabled");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Failed to enable notifications");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const subscription = await getPushSubscription();
      if (subscription) {
        await apiClientFetch("/push/subscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await unsubscribeFromPush(subscription);
      }
      setStatus("disabled");
      toast.success("Push notifications disabled");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to disable notifications");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    try {
      await apiClientFetch("/push/test", { method: "POST" });
      toast.success("Test notification sent");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send test notification");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Push Notifications</CardTitle>
        <CardDescription>
          Get notified in your browser or on your phone when a service goes down or recovers.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
        )}
        {status === "loading" && <p className="text-sm text-muted-foreground">Checking status...</p>}
        {status !== "loading" && status !== "unsupported" && (
          <div className="flex flex-wrap items-center gap-2">
            {status === "disabled" ? (
              <Button size="sm" onClick={handleEnable} disabled={busy} className="gap-2">
                <Bell className="size-4" />
                Enable Notifications
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleDisable} disabled={busy} className="gap-2">
                <BellOff className="size-4" />
                Disable Notifications
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleTest} disabled={busy || status !== "enabled"}>
              Send Test Notification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
