"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface WorkspaceOption {
  id: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

interface WorkspaceResponse {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string | null;
  isPlatformOwner: boolean;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await apiClientFetch<WorkspaceResponse>("/workspaces");
    setData(response);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function selectWorkspace(workspaceId: string) {
    setBusy(true);
    try {
      await apiClientFetch(`/workspaces/${workspaceId}/select`, { method: "POST" });
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createWorkspace() {
    const name = window.prompt("Project name");
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const response = await apiClientFetch<{ workspace: WorkspaceOption }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      await selectWorkspace(response.workspace.id);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />;
  }

  if (data.workspaces.length === 0) {
    return <span className="text-xs text-muted-foreground">No project assigned</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="workspace-switcher">Active project</label>
      <select
        id="workspace-switcher"
        value={data.activeWorkspaceId ?? data.workspaces[0]?.id}
        disabled={busy}
        onChange={(event) => void selectWorkspace(event.target.value)}
        className="h-9 max-w-52 rounded-md border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
      >
        {data.workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
        ))}
      </select>
      {data.isPlatformOwner && (
        <Button variant="outline" size="icon" onClick={() => void createWorkspace()} disabled={busy} title="Create project">
          <Plus className="size-4" />
          <span className="sr-only">Create project</span>
        </Button>
      )}
    </div>
  );
}
