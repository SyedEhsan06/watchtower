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

interface Pm2Process {
  name: string;
  pm2Id: number;
  status: string;
  pid: number | null;
  cpuPercent: number;
  memoryMb: number;
  restarts: number;
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
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Pm2Tab({
  serverId,
  active,
}: {
  serverId: string;
  active: boolean;
}) {
  function monitorThisHref(process: Pm2Process): string {
    const params = new URLSearchParams({
      serverId,
      runtimeType: "PM2",
      name: process.name,
      pm2ProcessName: process.name,
    });
    return `/services/new?${params.toString()}`;
  }

  const { data, loading, refreshing, error, fetchedAt, refresh } =
    useLiveResource<{
      processes: Pm2Process[];
    }>({
      path: `/servers/${serverId}/pm2`,
      enabled: active,
    });

  const processes = data?.processes ?? null;

  return (
    <div className="flex flex-col gap-3">
      <LiveToolbar
        fetchedAt={fetchedAt}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      {loading && !processes ? (
        <ListSkeleton />
      ) : error && !processes ? (
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
      ) : !processes || processes.length === 0 ? (
        <EmptyState
          title="No PM2 processes found"
          description="PM2 may not be installed, or no processes are running."
        />
      ) : (
        <>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Card className="py-0">
            <div className="divide-y">
              {processes.map((process) => (
                <div
                  key={process.pm2Id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{process.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      PID {process.pid ?? "—"} · {process.restarts} restarts
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{process.cpuPercent}% CPU</span>
                    <span>{process.memoryMb}MB</span>
                    <Badge
                      variant={
                        process.status === "online" ? "outline" : "secondary"
                      }
                      className={
                        process.status === "online"
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : ""
                      }
                    >
                      {process.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={monitorThisHref(process)} />}
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
