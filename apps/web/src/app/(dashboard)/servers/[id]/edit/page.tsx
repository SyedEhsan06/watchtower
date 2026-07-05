import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { ServerSummary } from "@/lib/types";
import { ServerForm } from "../../server-form";

async function getServer(id: string): Promise<ServerSummary | null> {
  const res = await apiServerFetch(`/servers/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.server;
}

export default async function EditServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = await getServer(id);
  if (!server) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Edit Server</h1>
      <ServerForm server={server} />
    </div>
  );
}
