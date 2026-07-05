"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
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

export function ServerMetrics({ serverId }: { serverId: string }) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClientFetch<{ metrics: SystemMetrics }>(`/servers/${serverId}/metrics`);
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !metrics) {
    return <p className="text-sm text-muted-foreground">Loading metrics...</p>;
  }

  if (error && !metrics) {
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

  if (!metrics) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">CPU</p>
            <p className="text-lg font-semibold">{metrics.cpuUsagePercent ?? "—"}%</p>
            <p className="text-xs text-muted-foreground">{metrics.cpuCount} cores</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">RAM</p>
            <p className="text-lg font-semibold">
              {formatMb(metrics.memoryUsedMb)} / {formatMb(metrics.memoryTotalMb)}
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
            <p className="text-lg font-semibold">{formatUptime(metrics.uptimeSeconds)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {metrics.os ?? "Unknown OS"} · {metrics.kernel} · load {metrics.loadAverage.map((n) => n.toFixed(2)).join(", ")}
        </span>
        <div className="flex items-center gap-2">
          <span>Updated {new Date(metrics.collectedAt).toLocaleTimeString()}</span>
          <Button size="icon-sm" variant="ghost" onClick={load}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
