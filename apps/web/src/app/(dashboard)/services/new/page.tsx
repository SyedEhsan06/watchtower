import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiServerFetch } from "@/lib/api-server";
import type { ServerSummary, ServiceGroupSummary } from "@/lib/types";
import { NewServiceForm } from "./new-service-form";

async function getServers(): Promise<ServerSummary[]> {
  const res = await apiServerFetch("/servers");
  if (!res.ok) return [];
  const data = await res.json();
  return data.servers;
}

async function getGroups(): Promise<ServiceGroupSummary[]> {
  const res = await apiServerFetch("/service-groups");
  if (!res.ok) return [];
  const data = await res.json();
  return data.groups;
}

interface PrefillSearchParams {
  serverId?: string;
  runtimeType?: string;
  name?: string;
  dockerContainerName?: string;
  pm2ProcessName?: string;
  groupId?: string;
}

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<PrefillSearchParams>;
}) {
  const [servers, groups, params] = await Promise.all([getServers(), getGroups(), searchParams]);

  const prefill = {
    serverId: params.serverId,
    runtimeType: params.runtimeType,
    name: params.name,
    dockerContainerName: params.dockerContainerName,
    pm2ProcessName: params.pm2ProcessName,
    groupId: params.groupId,
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-8 w-8" render={<Link href="/services" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Add Service</h1>
      </div>
      <NewServiceForm servers={servers} groups={groups} prefill={prefill} />
    </div>
  );
}
