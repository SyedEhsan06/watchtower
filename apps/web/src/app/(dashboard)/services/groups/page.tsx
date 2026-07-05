import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiServerFetch } from "@/lib/api-server";
import type { ServiceGroupSummary } from "@/lib/types";
import { GroupsManager } from "./groups-manager";

async function getGroups(): Promise<ServiceGroupSummary[]> {
  const res = await apiServerFetch("/service-groups");
  if (!res.ok) return [];
  const data = await res.json();
  return data.groups;
}

export default async function ServiceGroupsPage() {
  const groups = await getGroups();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-8 w-8" render={<Link href="/services" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Manage Groups</h1>
      </div>
      <GroupsManager initialGroups={groups} />
    </div>
  );
}
