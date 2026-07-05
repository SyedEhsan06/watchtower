import { notFound } from "next/navigation";
import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { ServerSummary, ServiceSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusLabel } from "@/components/status-dot";
import { EnvironmentBadge } from "@/components/environment-badge";
import { ServerTabs } from "./server-tabs";
import { ScanServerButton } from "./scan-button";
import { TestConnectionButton } from "./test-connection-button";
import { Pencil } from "lucide-react";

async function getServer(id: string): Promise<ServerSummary | null> {
  const res = await apiServerFetch(`/servers/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.server;
}

async function getServices(serverId: string): Promise<ServiceSummary[]> {
  const res = await apiServerFetch(`/services?serverId=${serverId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.services;
}

export default async function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = await getServer(id);
  if (!server) notFound();

  const services = await getServices(id);
  const hasSsh = Boolean(server.sshUsername);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{server.name}</h1>
            <EnvironmentBadge environment={server.environment} />
          </div>
          <p className="text-sm text-muted-foreground">
            {server.host}:{server.sshPort}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusLabel status={server.connectionStatus} />
          {hasSsh && (
            <>
              <TestConnectionButton serverId={server.id} />
              <ScanServerButton serverId={server.id} />
            </>
          )}
          <Button size="sm" variant="outline" className="gap-2" render={<Link href={`/servers/${server.id}/edit`} />}>
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </div>

      <ServerTabs server={server} services={services} />
    </div>
  );
}
