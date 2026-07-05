"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { RefreshCw } from "lucide-react";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string;
  ports: string;
}

export function DockerTab({ serverId }: { serverId: string }) {
  function monitorThisHref(container: DockerContainer): string {
    const params = new URLSearchParams({
      serverId,
      runtimeType: "DOCKER",
      name: container.name,
      dockerContainerName: container.name,
    });
    return `/services/new?${params.toString()}`;
  }

  const [containers, setContainers] = useState<DockerContainer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClientFetch<{ containers: DockerContainer[] }>(`/servers/${serverId}/docker`);
      setContainers(data.containers);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load Docker containers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading Docker containers...</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-red-500">{error}</p>
        <Button size="sm" variant="outline" onClick={load} className="w-fit gap-2">
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!containers || containers.length === 0) {
    return <EmptyState title="No containers found" description="Docker may not be installed, or no containers exist." />;
  }

  return (
    <Card className="py-0">
      <div className="divide-y">
        {containers.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.image}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{c.ports || "—"}</span>
              <Badge variant={c.state === "running" ? "outline" : "secondary"} className={c.state === "running" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : ""}>
                {c.status}
              </Badge>
              <Button size="sm" variant="outline" render={<Link href={monitorThisHref(c)} />}>
                Monitor This
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
