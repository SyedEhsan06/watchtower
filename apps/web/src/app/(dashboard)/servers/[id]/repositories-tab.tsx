"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { RefreshCw } from "lucide-react";

interface GitRepoInfo {
  directory: string;
  remoteUrl: string | null;
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  commitAuthor: string | null;
  commitDate: string | null;
  isDirty: boolean;
}

export function RepositoriesTab({ serverId, hasProjectDirectories }: { serverId: string; hasProjectDirectories: boolean }) {
  const [repos, setRepos] = useState<GitRepoInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClientFetch<{ repositories: GitRepoInfo[] }>(`/servers/${serverId}/scan`, { method: "POST" });
      setRepos(data.repositories);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to discover repositories");
    } finally {
      setLoading(false);
    }
  }

  if (!hasProjectDirectories) {
    return (
      <EmptyState
        title="No project directories configured"
        description="Add project directories in Settings to scan for Git repositories."
      />
    );
  }

  if (!repos && !loading && !error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
        <p className="text-sm text-muted-foreground">Run a scan to discover repositories.</p>
        <Button size="sm" onClick={load}>
          Scan for Repositories
        </Button>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Scanning...</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-red-500">{error}</p>
        <Button size="sm" variant="outline" onClick={load} className="w-fit gap-2">
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return <EmptyState title="No repositories found" description="No Git repositories were found in the configured project directories." />;
  }

  return (
    <Card className="py-0">
      <div className="divide-y">
        {repos.map((repo) => (
          <div key={repo.directory} className="flex flex-col gap-1 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-muted-foreground">{repo.directory}</p>
              <Badge variant={repo.isDirty ? "secondary" : "outline"} className={!repo.isDirty ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : ""}>
                {repo.isDirty ? "Dirty" : "Clean"}
              </Badge>
            </div>
            <p className="font-medium">{repo.commitMessage ?? "No commits"}</p>
            <p className="text-xs text-muted-foreground">
              {repo.branch ?? "unknown branch"} · {repo.commitSha?.slice(0, 7) ?? "—"} · {repo.commitAuthor ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
