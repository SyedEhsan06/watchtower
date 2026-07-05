import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { ServiceSummary, ServiceGroupSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Plus, Settings2 } from "lucide-react";
import { ServicesListClient } from "./services-list-client";

async function getServices(): Promise<ServiceSummary[]> {
  const res = await apiServerFetch("/services");
  if (!res.ok) return [];
  const data = await res.json();
  return data.services;
}

async function getGroups(): Promise<ServiceGroupSummary[]> {
  const res = await apiServerFetch("/service-groups");
  if (!res.ok) return [];
  const data = await res.json();
  return data.groups;
}

export default async function ServicesPage() {
  const [services, groups] = await Promise.all([getServices(), getGroups()]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Services</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" render={<Link href="/services/groups" />}>
            <Settings2 className="size-4" />
            Manage Groups
          </Button>
          <Button size="sm" className="gap-2" render={<Link href="/services/new" />}>
            <Plus className="size-4" />
            Add Service
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Add a service to monitor an HTTP endpoint, TCP port, or SSH-managed process."
          action={{ href: "/services/new", label: "Add Service" }}
        />
      ) : (
        <ServicesListClient initialServices={services} groups={groups} />
      )}
    </div>
  );
}
