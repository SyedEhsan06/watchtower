import { notFound } from "next/navigation";
import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { ServiceSummary, IncidentSummary } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusLabel } from "@/components/status-dot";
import { EnvironmentBadge } from "@/components/environment-badge";
import { Pencil, ChevronLeft } from "lucide-react";
import { CheckNowButton } from "./check-now-button";
import { LogViewer } from "@/components/log-viewer";
import { RestartButton } from "@/components/restart-button";
import { NotificationToggle } from "@/components/notification-toggle";
import { RepositorySection } from "./repository-section";

interface CheckResult {
  id: string;
  status: string;
  responseTimeMs: number | null;
  statusCode: number | null;
  errorSummary: string | null;
  checkedAt: string;
}

async function getService(id: string): Promise<ServiceSummary | null> {
  const res = await apiServerFetch(`/services/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.service;
}

async function getChecks(id: string): Promise<CheckResult[]> {
  const res = await apiServerFetch(`/services/${id}/checks`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.checks;
}

async function getIncidents(id: string): Promise<IncidentSummary[]> {
  const res = await apiServerFetch(`/services/${id}/incidents`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.incidents;
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();

  const [checks, incidents] = await Promise.all([getChecks(id), getIncidents(id)]);
  const hasRuntimeMapping = Boolean(
    service.dockerContainerName || service.pm2ProcessName || service.systemdUnitName
  );
  const hasLogs = hasRuntimeMapping;
  const hasRepository = Boolean(service.repositoryUrl);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" render={<Link href="/services" />}>
            <ChevronLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{service.name}</h1>
              <EnvironmentBadge environment={service.environment} />
            </div>
          <p className="text-sm text-muted-foreground">
            {service.server ? (
              <Link href={`/servers/${service.server.id}`} className="hover:underline">
                {service.server.name}
              </Link>
            ) : (
              "External"
            )}
            {" · "}
            {service.monitorType}
          </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusLabel status={service.status} />
          <CheckNowButton serviceId={service.id} />
          {hasRuntimeMapping && <RestartButton serviceId={service.id} serviceName={service.name} />}
          <NotificationToggle serviceId={service.id} notificationsEnabled={service.notificationsEnabled} />
          <Button size="sm" variant="outline" className="gap-2" render={<Link href={`/services/${service.id}/edit`} />}>
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Consecutive Failures</p>
            <p className="text-lg font-semibold">{service.consecutiveFailures}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Last Checked</p>
            <p className="text-sm font-medium">
              {service.lastCheckedAt ? new Date(service.lastCheckedAt).toLocaleString() : "Never"}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Runtime</p>
            <p className="text-sm font-medium">{service.runtimeType}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Check Interval</p>
            <p className="text-sm font-medium">every {service.checkIntervalSeconds}s</p>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Recent Checks</h2>
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checks recorded yet.</p>
        ) : (
          <Card className="py-0">
            <div className="divide-y">
              {checks.slice(0, 20).map((check) => (
                <div key={check.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <StatusLabel status={check.status as "UP" | "DOWN" | "DEGRADED" | "UNKNOWN"} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(check.checkedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {check.responseTimeMs != null && <span>{check.responseTimeMs}ms</span>}
                    {check.statusCode != null && <span>HTTP {check.statusCode}</span>}
                    {check.errorSummary && <span className="text-red-500">{check.errorSummary}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Incidents</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents recorded.</p>
        ) : (
          <Card className="py-0">
            <div className="divide-y">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {incident.resolvedAt ? "Resolved" : "Active"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started {new Date(incident.startedAt).toLocaleString()}
                    </p>
                  </div>
                  {incident.initialError && (
                    <p className="max-w-xs truncate text-xs text-muted-foreground">{incident.initialError}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {hasRepository && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Repository</h2>
          <RepositorySection serviceId={service.id} />
        </section>
      )}

      {hasLogs && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Logs</h2>
          <LogViewer serviceId={service.id} />
        </section>
      )}
    </div>
  );
}
