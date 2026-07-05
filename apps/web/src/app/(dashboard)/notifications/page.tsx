import { NotificationSettings } from "./notification-settings";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Notifications</h1>
      <NotificationSettings />
    </div>
  );
}
