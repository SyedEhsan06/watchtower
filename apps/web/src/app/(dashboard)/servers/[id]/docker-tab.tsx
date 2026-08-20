"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { LiveToolbar } from "@/components/live-toolbar";
import { useLiveResource } from "@/hooks/use-live-resource";
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

function ListSkeleton() {
  return (
    <Card className="py-0">
      <div className="divide-y">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DockerTab({
  serverId,
  active,
}: {
  serverId: string;
  active: boolean;
}) {
  function monitorThisHref(container: DockerContainer): string {
    const params = new URLSearchParams({
      serverId,
      runtimeType: "DOCKER",
      name: container.name,
      dockerContainerName: container.name,
    });
    return `/services/new?${params.toString()}`;
  }

  const { data, loading, refreshing, error, fetchedAt, refresh } =
    useLiveResource<{
      containers: DockerContainer[];
    }>({
      path: `/servers/${serverId}/docker`,
      enabled: active,
    });

  const containers = data?.containers ?? null;

  return (
    <div className="flex flex-col gap-3">
      <LiveToolbar
        fetchedAt={fetchedAt}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      {loading && !containers ? (
        <ListSkeleton />
      ) : error && !containers ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-red-500">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            className="w-fit gap-2"
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : !containers || containers.length === 0 ? (
        <EmptyState
          title="No containers found"
          description="Docker may not be installed, or no containers exist."
        />
      ) : (
        <>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Card className="py-0">
            <div className="divide-y">
              {containers.map((container) => (
                <div
                  key={container.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{container.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {container.image}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{container.ports || "—"}</span>
                    <Badge
                      variant={
                        container.state === "running" ? "outline" : "secondary"
                      }
                      className={
                        container.state === "running"
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : ""
                      }
                    >
                      {container.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={monitorThisHref(container)} />}
                    >
                      Monitor This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
