import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { ServerSummary } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusLabel } from "@/components/status-dot";
import { EnvironmentBadge } from "@/components/environment-badge";
import { EmptyState } from "@/components/empty-state";
import { Plus } from "lucide-react";

async function getServers(): Promise<ServerSummary[]> {
  const res = await apiServerFetch("/servers");
  if (!res.ok) return [];
  const data = await res.json();
  return data.servers;
}

export default async function ServersPage() {
  const servers = await getServers();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Servers</h1>
        <Button size="sm" className="gap-2" render={<Link href="/servers/new" />}>
          <Plus className="size-4" />
          Add Server
        </Button>
      </div>

      {servers.length === 0 ? (
        <EmptyState
          title="No servers yet"
          description="Add a server to connect via SSH and start monitoring it."
          action={{ href: "/servers/new", label: "Add Server" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <Link key={server.id} href={`/servers/${server.id}`}>
              <Card className="h-full py-4 transition-colors hover:bg-accent/40">
                <CardHeader className="flex flex-row items-center justify-between px-4">
                  <StatusLabel status={server.connectionStatus} />
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
    </div>
  );
}
