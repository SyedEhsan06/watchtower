"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
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

export function Pm2Tab({ serverId }: { serverId: string }) {
  function monitorThisHref(process: Pm2Process): string {
    const params = new URLSearchParams({
      serverId,
      runtimeType: "PM2",
      name: process.name,
      pm2ProcessName: process.name,
    });
    return `/services/new?${params.toString()}`;
  }

  const [processes, setProcesses] = useState<Pm2Process[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClientFetch<{ processes: Pm2Process[] }>(`/servers/${serverId}/pm2`);
      setProcesses(data.processes);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load PM2 processes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading PM2 processes...</p>;
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

  if (!processes || processes.length === 0) {
    return <EmptyState title="No PM2 processes found" description="PM2 may not be installed, or no processes are running." />;
  }

  return (
    <Card className="py-0">
      <div className="divide-y">
        {processes.map((p) => (
          <div key={p.pm2Id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                PID {p.pid ?? "—"} · {p.restarts} restarts
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{p.cpuPercent}% CPU</span>
              <span>{p.memoryMb}MB</span>
              <Badge variant={p.status === "online" ? "outline" : "secondary"} className={p.status === "online" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : ""}>
                {p.status}
              </Badge>
              <Button size="sm" variant="outline" render={<Link href={monitorThisHref(p)} />}>
                Monitor This
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
