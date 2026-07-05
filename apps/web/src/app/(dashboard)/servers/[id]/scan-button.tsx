"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScanSearch } from "lucide-react";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";

export function ScanServerButton({ serverId }: { serverId: string }) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    setScanning(true);
    try {
      await apiClientFetch(`/servers/${serverId}/scan`, { method: "POST" });
      toast.success("Scan complete");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleScan} disabled={scanning} className="gap-2">
      <ScanSearch className={`size-4 ${scanning ? "animate-pulse" : ""}`} />
      {scanning ? "Scanning..." : "Scan Server"}
    </Button>
  );
}
