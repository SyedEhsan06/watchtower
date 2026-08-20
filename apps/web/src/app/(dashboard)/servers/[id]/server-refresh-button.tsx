"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WATCHTOWER_REFRESH_EVENT } from "@/hooks/use-live-resource";
import { cn } from "@/lib/utils";

export function ServerRefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    window.dispatchEvent(new Event(WATCHTOWER_REFRESH_EVENT));
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRefresh}
      disabled={refreshing}
      className="gap-2"
    >
      <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
      Refresh
    </Button>
  );
}
