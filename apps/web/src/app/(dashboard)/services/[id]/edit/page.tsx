import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { ServerSummary, ServiceSummary, ServiceGroupSummary } from "@/lib/types";
import { NewServiceForm } from "../../new/new-service-form";

async function getService(id: string): Promise<ServiceSummary | null> {
  const res = await apiServerFetch(`/services/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.service;
}

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

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [service, servers, groups] = await Promise.all([getService(id), getServers(), getGroups()]);
  if (!service) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Edit Service</h1>
      <NewServiceForm servers={servers} groups={groups} service={service} />
    </div>
  );
}
