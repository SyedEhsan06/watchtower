"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import type { ServiceGroupSummary } from "@/lib/types";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export function GroupsManager({ initialGroups }: { initialGroups: ServiceGroupSummary[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { group } = await apiClientFetch<{ group: ServiceGroupSummary }>("/service-groups", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setGroups([...groups, group].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      toast.success("Group created");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClientFetch(`/service-groups/${id}`, { method: "DELETE" });
      setGroups(groups.filter((g) => g.id !== id));
      toast.success("Group deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete group");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex gap-2 p-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Travel CRM"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          />
          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="gap-2">
            <Plus className="size-4" />
            Add Group
          </Button>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <EmptyState title="No groups yet" description="Create a group to organize related services together." />
      ) : (
        <Card className="py-0">
          <div className="divide-y">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-muted-foreground">{group._count?.services ?? 0} services</p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(group.id)}>
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
