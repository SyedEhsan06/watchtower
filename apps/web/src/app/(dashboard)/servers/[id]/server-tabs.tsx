"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import type { ServerSummary, ServiceSummary } from "@/lib/types";
import { ServicesList } from "./services-list";
import { DockerTab } from "./docker-tab";
import { Pm2Tab } from "./pm2-tab";
import { ServerMetrics } from "./server-metrics";
import { RepositoriesTab } from "./repositories-tab";
import { ApiAccessTab } from "./api-access-tab";

const hasSsh = (server: ServerSummary) => Boolean(server.sshUsername);

function NoSshNotice() {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      Configure SSH credentials for this server (Settings tab) to enable this feature.
    </div>
  );
}

export function ServerTabs({ server, services }: { server: ServerSummary; services: ServiceSummary[] }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="docker">Docker</TabsTrigger>
        <TabsTrigger value="pm2">PM2</TabsTrigger>
        <TabsTrigger value="repositories">Repositories</TabsTrigger>
        <TabsTrigger value="api-access">API Access</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Provider</p>
              <p className="text-sm font-medium">{server.provider ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">SSH User</p>
              <p className="text-sm font-medium">{server.sshUsername ?? "Not configured"}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Last Connected</p>
              <p className="text-sm font-medium">
                {server.lastConnectedAt ? new Date(server.lastConnectedAt).toLocaleString() : "Never"}
              </p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Services</p>
              <p className="text-sm font-medium">{services.length}</p>
            </CardContent>
          </Card>
        </div>
        {hasSsh(server) ? <ServerMetrics serverId={server.id} /> : <NoSshNotice />}
        {server.lastConnectionError && (
          <p className="text-xs text-red-500">Last error: {server.lastConnectionError}</p>
        )}
      </TabsContent>

      <TabsContent value="services">
        <ServicesList services={services} />
      </TabsContent>

      <TabsContent value="docker">{hasSsh(server) ? <DockerTab serverId={server.id} /> : <NoSshNotice />}</TabsContent>

      <TabsContent value="pm2">{hasSsh(server) ? <Pm2Tab serverId={server.id} /> : <NoSshNotice />}</TabsContent>

      <TabsContent value="repositories">
        {hasSsh(server) ? (
          <RepositoriesTab serverId={server.id} hasProjectDirectories={server.projectDirectories.length > 0} />
        ) : (
          <NoSshNotice />
        )}
      </TabsContent>

      <TabsContent value="api-access">
        <ApiAccessTab serverId={server.id} />
      </TabsContent>

      <TabsContent value="settings" className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{server.description ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project Directories</p>
              {server.projectDirectories.length === 0 ? (
                <p className="text-sm text-muted-foreground">None configured</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1">
                  {server.projectDirectories.map((dir) => (
                    <li key={dir} className="font-mono text-xs">
                      {dir}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {server.sshHostKeyFingerprint && (
              <div>
                <p className="text-xs text-muted-foreground">Trusted Host Key Fingerprint</p>
                <p className="font-mono text-xs">{server.sshHostKeyFingerprint}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
