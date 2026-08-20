"use client";

import { LiveToolbar } from "@/components/live-toolbar";
import { useLiveResource } from "@/hooks/use-live-resource";
import type { ServiceSummary } from "@/lib/types";
import { ServicesList } from "./services-list";

export function ServicesTab({
  serverId,
  initialServices,
  active,
}: {
  serverId: string;
  initialServices: ServiceSummary[];
  active: boolean;
}) {
  const { data, refreshing, error, fetchedAt, refresh } = useLiveResource<{
    services: ServiceSummary[];
  }>({
    path: `/services?serverId=${serverId}`,
    enabled: active,
    initialData: { services: initialServices },
  });

  const services = data?.services ?? initialServices;

  return (
    <div className="flex flex-col gap-3">
      <LiveToolbar
        fetchedAt={fetchedAt}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <ServicesList services={services} />
    </div>
  );
}
