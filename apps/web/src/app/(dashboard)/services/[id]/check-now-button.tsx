"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";

export function CheckNowButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  async function handleCheck() {
    setLoading(true);
    try {
      await apiClientFetch(`/services/${serviceId}/check`, { method: "POST" });
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleCheck} disabled={loading} className="gap-2">
      <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
      Check Now
    </Button>
  );
}
