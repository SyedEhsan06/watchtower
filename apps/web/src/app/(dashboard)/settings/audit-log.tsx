import { apiServerFetch } from "@/lib/api-server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

interface AuditLogEntry {
  id: string;
  action: string;
  result: string;
  createdAt: string;
  user: { email: string } | null;
  server: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
  metadata: Record<string, unknown> | null;
}

async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const res = await apiServerFetch("/audit-logs");
  if (!res.ok) return [];
  const data = await res.json();
  return data.logs;
}

export async function AuditLogSection() {
  const logs = await getAuditLogs();

  if (logs.length === 0) {
    return <EmptyState title="No audit log entries" description="Restart actions and other sensitive operations will appear here." />;
  }

  return (
    <Card className="py-0">
      <div className="divide-y">
        {logs.map((log) => (
          <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">
                {log.action} {log.service ? `· ${log.service.name}` : log.server ? `· ${log.server.name}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {log.user?.email ?? "Unknown user"} · {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge
              variant={log.result === "SUCCESS" ? "outline" : "destructive"}
              className={log.result === "SUCCESS" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : ""}
            >
              {log.result}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
