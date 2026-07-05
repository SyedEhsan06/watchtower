import { getCurrentUser } from "@/lib/api-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLogSection } from "./audit-log";
import { NotificationSettings } from "../notifications/notification-settings";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        </CardContent>
      </Card>

      <NotificationSettings />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Audit Log</h2>
        <AuditLogSection />
      </div>
    </div>
  );
}
