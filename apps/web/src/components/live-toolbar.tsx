"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LiveToolbar({
  fetchedAt,
  refreshing,
  onRefresh,
}: {
  fetchedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {fetchedAt
          ? `Updated ${new Date(fetchedAt).toLocaleTimeString()}`
          : "Waiting for data"}
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRefresh}
        disabled={refreshing}
        className="gap-2"
      >
        <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}
