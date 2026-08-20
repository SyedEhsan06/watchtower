"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { LiveToolbar } from "@/components/live-toolbar";
import { useLiveResource } from "@/hooks/use-live-resource";
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

export function RepositoriesTab({
  serverId,
  hasProjectDirectories,
  active,
}: {
  serverId: string;
  hasProjectDirectories: boolean;
  active: boolean;
}) {
  const { data, loading, refreshing, error, fetchedAt, refresh } =
    useLiveResource<{
      repositories: GitRepoInfo[];
    }>({
      path: `/servers/${serverId}/repositories`,
      enabled: active && hasProjectDirectories,
    });

  const repos = data?.repositories ?? null;

  if (!hasProjectDirectories) {
    return (
      <EmptyState
        title="No project directories configured"
        description="Add project directories in Settings to scan for Git repositories."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <LiveToolbar
        fetchedAt={fetchedAt}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      {loading && !repos ? (
        <Card className="py-0">
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2 px-4 py-3">
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </Card>
      ) : error && !repos ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-red-500">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            className="w-fit gap-2"
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : !repos || repos.length === 0 ? (
        <EmptyState
          title="No repositories found"
          description="No Git repositories were found in the configured project directories."
        />
      ) : (
        <>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Card className="py-0">
            <div className="divide-y">
              {repos.map((repo) => (
                <div
                  key={repo.directory}
                  className="flex flex-col gap-1 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-muted-foreground">
                      {repo.directory}
                    </p>
                    <Badge
                      variant={repo.isDirty ? "secondary" : "outline"}
                      className={
                        !repo.isDirty
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : ""
                      }
                    >
                      {repo.isDirty ? "Dirty" : "Clean"}
                    </Badge>
                  </div>
                  <p className="font-medium">
                    {repo.commitMessage ?? "No commits"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {repo.branch ?? "unknown branch"} ·{" "}
                    {repo.commitSha?.slice(0, 7) ?? "—"} ·{" "}
                    {repo.commitAuthor ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
