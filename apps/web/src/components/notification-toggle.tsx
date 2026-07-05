"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";

export function NotificationToggle({
  serviceId,
  notificationsEnabled,
}: {
  serviceId: string;
  notificationsEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    try {
      await apiClientFetch(`/services/${serviceId}`, {
        method: "PATCH",
        body: JSON.stringify({ notificationsEnabled: !notificationsEnabled }),
      });
      toast.success(notificationsEnabled ? "Notifications muted for this service" : "Notifications enabled for this service");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update notification setting");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleToggle} disabled={busy} className="gap-2">
      {notificationsEnabled ? <Bell className="size-4" /> : <BellOff className="size-4 text-muted-foreground" />}
      {notificationsEnabled ? "Notifications On" : "Notifications Muted"}
    </Button>
  );
}
