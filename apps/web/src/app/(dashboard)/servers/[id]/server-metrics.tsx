"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveToolbar } from "@/components/live-toolbar";
import { useLiveResource } from "@/hooks/use-live-resource";
import { RefreshCw } from "lucide-react";

interface SystemMetrics {
  hostname: string;
  os: string | null;
  kernel: string;
  uptimeSeconds: number;
  cpuCount: number;
  cpuUsagePercent: number | null;
  loadAverage: [number, number, number];
  memoryTotalMb: number;
  memoryUsedMb: number;
  diskTotalMb: number;
  diskUsedMb: number;
  collectedAt: string;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${mb}MB`;
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="py-4">
          <CardContent className="flex flex-col gap-2 px-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ServerMetrics({
  serverId,
  active,
}: {
  serverId: string;
  active: boolean;
}) {
  const { data, loading, refreshing, error, fetchedAt, refresh } =
    useLiveResource<{
      metrics: SystemMetrics;
    }>({
      path: `/servers/${serverId}/metrics`,
      enabled: active,
      refreshIntervalMs: 30_000,
    });

  const metrics = data?.metrics ?? null;

  if (loading && !metrics) {
    return (
      <div className="flex flex-col gap-3">
        <LiveToolbar
          fetchedAt={fetchedAt}
          refreshing={refreshing}
          onRefresh={refresh}
        />
        <MetricsSkeleton />
      </div>
    );
  }

  if (error && !metrics) {
    return (
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
    );
  }

  if (!metrics) return null;

  return (
    <div className="flex flex-col gap-3">
      <LiveToolbar
        fetchedAt={fetchedAt}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">CPU</p>
            <p className="text-lg font-semibold">
              {metrics.cpuUsagePercent ?? "—"}%
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.cpuCount} cores
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">RAM</p>
            <p className="text-lg font-semibold">
              {formatMb(metrics.memoryUsedMb)} /{" "}
              {formatMb(metrics.memoryTotalMb)}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Disk</p>
            <p className="text-lg font-semibold">
              {formatMb(metrics.diskUsedMb)} / {formatMb(metrics.diskTotalMb)}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Uptime</p>
            <p className="text-lg font-semibold">
              {formatUptime(metrics.uptimeSeconds)}
            </p>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        {metrics.os ?? "Unknown OS"} · {metrics.kernel} · load{" "}
        {metrics.loadAverage.map((n) => n.toFixed(2)).join(", ")}
      </p>
    </div>
  );
}
