"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";

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

export function RepositorySection({ serviceId }: { serviceId: string }) {
  const [repo, setRepo] = useState<GitRepoInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClientFetch<{ repo: GitRepoInfo | null }>(`/services/${serviceId}/git`)
      .then((data) => setRepo(data.repo))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load repository info"));
  }, [serviceId]);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (repo === undefined) return <p className="text-sm text-muted-foreground">Loading repository info...</p>;
  if (repo === null) return <p className="text-sm text-muted-foreground">No repository detected at the configured working directory.</p>;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium">{repo.branch ?? "unknown branch"}</p>
          <Badge variant={repo.isDirty ? "secondary" : "outline"} className={!repo.isDirty ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : ""}>
            {repo.isDirty ? "Dirty" : "Clean"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Deployed commit: {repo.commitSha?.slice(0, 7) ?? "—"}</p>
        <p>{repo.commitMessage ?? "No commits"}</p>
        <p className="text-xs text-muted-foreground">
          {repo.commitAuthor ?? "—"} · {repo.commitDate ? new Date(repo.commitDate).toLocaleString() : "—"}
        </p>
      </CardContent>
    </Card>
  );
}
