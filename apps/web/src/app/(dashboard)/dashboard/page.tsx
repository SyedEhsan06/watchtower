import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { ServerSummary, ServiceSummary, IncidentSummary } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusLabel } from "@/components/status-dot";
import { EnvironmentBadge } from "@/components/environment-badge";
import { EmptyState } from "@/components/empty-state";
import { Server as ServerIcon, Boxes, AlertTriangle, CheckCircle2 } from "lucide-react";

async function getServers(): Promise<ServerSummary[]> {
  const res = await apiServerFetch("/servers");
  if (!res.ok) return [];
  const data = await res.json();
  return data.servers;
}

async function getServices(): Promise<ServiceSummary[]> {
  const res = await apiServerFetch("/services");
  if (!res.ok) return [];
  const data = await res.json();
  return data.services;
}

async function getIncidents(): Promise<IncidentSummary[]> {
  const res = await apiServerFetch("/incidents");
  if (!res.ok) return [];
  const data = await res.json();
  return data.incidents;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: "danger" | "default";
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center justify-between px-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-semibold ${tone === "danger" && value > 0 ? "text-red-500" : ""}`}>
            {value}
          </p>
        </div>
        <Icon className={`size-5 ${tone === "danger" && value > 0 ? "text-red-500" : "text-muted-foreground"}`} />
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [servers, services, incidents] = await Promise.all([getServers(), getServices(), getIncidents()]);

  const serversOnline = servers.filter((s) => s.connectionStatus === "ONLINE").length;
  const servicesUp = services.filter((s) => s.status === "UP").length;
  const servicesDown = services.filter((s) => s.status === "DOWN").length;
  const activeIncidents = incidents.filter((i) => !i.resolvedAt).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Servers Online" value={serversOnline} icon={ServerIcon} />
        <SummaryCard label="Services Up" value={servicesUp} icon={CheckCircle2} />
        <SummaryCard label="Services Down" value={servicesDown} icon={AlertTriangle} tone="danger" />
        <SummaryCard label="Active Incidents" value={activeIncidents} icon={Boxes} tone="danger" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Servers</h2>
        {servers.length === 0 ? (
          <EmptyState
            title="No servers yet"
            description="Add a server to start monitoring via SSH."
            action={{ href: "/servers", label: "Add Server" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => (
              <Link key={server.id} href={`/servers/${server.id}`}>
                <Card className="h-full py-4 transition-colors hover:bg-accent/40">
                  <CardHeader className="flex flex-row items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                      <StatusLabel status={server.connectionStatus} />
                    </div>
                    <EnvironmentBadge environment={server.environment} />
                  </CardHeader>
                  <CardContent className="px-4">
                    <p className="font-medium">{server.name}</p>
                    <p className="text-xs text-muted-foreground">{server.host}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {server._count?.services ?? 0} services monitored
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Service Health</h2>
        {services.length === 0 ? (
          <EmptyState
            title="No services yet"
            description="Add a service to start monitoring it."
            action={{ href: "/services", label: "Add Service" }}
          />
        ) : (
          <Card className="py-0">
            <div className="divide-y">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusLabel status={service.status} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{service.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {service.server?.name ?? "External"}
                      </p>
                    </div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
                    <EnvironmentBadge environment={service.environment} />
                    <span>{service.runtimeType}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
