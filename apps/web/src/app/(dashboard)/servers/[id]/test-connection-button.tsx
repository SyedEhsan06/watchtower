"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plug } from "lucide-react";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";

export function TestConnectionButton({ serverId }: { serverId: string }) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    setTesting(true);
    try {
      const result = await apiClientFetch<{ hostname: string }>(`/servers/${serverId}/test`, { method: "POST" });
      toast.success(`Connected to ${result.hostname}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Connection failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
      <Plug className="size-4" />
      {testing ? "Testing..." : "Test Connection"}
    </Button>
  );
}
