import { loadServerSshParams } from "../ssh/server-credentials.js";
import {
  collectSystemMetrics,
  type SystemMetrics,
} from "../scan/system-metrics.js";
import {
  listDockerContainers,
  type DockerContainer,
} from "../docker/docker.js";
import { listPm2Processes, type Pm2Process } from "../pm2/pm2.js";
import { discoverGitRepositories, type GitRepoInfo } from "../git/git.js";
import { getCached, setCached } from "../cache/ttl-cache.js";

/** Long enough to make tab switches instant, short enough that a refresh still feels live. */
export const LIVE_SNAPSHOT_TTL_MS = 20_000;
export const REPO_SNAPSHOT_TTL_MS = 45_000;

export function metricsCacheKey(serverId: string): string {
  return `live:metrics:${serverId}`;
}

export function dockerCacheKey(serverId: string): string {
  return `live:docker:${serverId}`;
}

export function pm2CacheKey(serverId: string): string {
  return `live:pm2:${serverId}`;
}

export function reposCacheKey(serverId: string): string {
  return `live:repos:${serverId}`;
}

export function rememberLiveSnapshots(
  serverId: string,
  snapshots: {
    metrics?: SystemMetrics;
    containers?: DockerContainer[];
    processes?: Pm2Process[];
    repositories?: GitRepoInfo[];
  },
): void {
  if (snapshots.metrics) {
    setCached(
      metricsCacheKey(serverId),
      snapshots.metrics,
      LIVE_SNAPSHOT_TTL_MS,
    );
  }
  if (snapshots.containers) {
    setCached(
      dockerCacheKey(serverId),
      snapshots.containers,
      LIVE_SNAPSHOT_TTL_MS,
    );
  }
  if (snapshots.processes) {
    setCached(pm2CacheKey(serverId), snapshots.processes, LIVE_SNAPSHOT_TTL_MS);
  }
  if (snapshots.repositories) {
    setCached(
      reposCacheKey(serverId),
      snapshots.repositories,
      REPO_SNAPSHOT_TTL_MS,
    );
  }
}

export function wantsFreshQuery(query: unknown): boolean {
  const fresh = (query as { fresh?: string } | undefined)?.fresh;
  return fresh === "1" || fresh === "true";
}

export async function getLiveMetrics(
  serverId: string,
  options?: { force?: boolean },
): Promise<SystemMetrics> {
  return getCached(
    metricsCacheKey(serverId),
    LIVE_SNAPSHOT_TTL_MS,
    async () => {
      const sshParams = await loadServerSshParams(serverId);
      return collectSystemMetrics(sshParams);
    },
    options,
  );
}

export async function getLiveDocker(
  serverId: string,
  options?: { force?: boolean },
): Promise<DockerContainer[]> {
  return getCached(
    dockerCacheKey(serverId),
    LIVE_SNAPSHOT_TTL_MS,
    async () => {
      const sshParams = await loadServerSshParams(serverId);
      return listDockerContainers(sshParams);
    },
    options,
  );
}

export async function getLivePm2(
  serverId: string,
  options?: { force?: boolean },
): Promise<Pm2Process[]> {
  return getCached(
    pm2CacheKey(serverId),
    LIVE_SNAPSHOT_TTL_MS,
    async () => {
      const sshParams = await loadServerSshParams(serverId);
      return listPm2Processes(sshParams);
    },
    options,
  );
}

export async function getLiveRepositories(
  serverId: string,
  projectDirectories: string[],
  options?: { force?: boolean },
): Promise<GitRepoInfo[]> {
  return getCached(
    reposCacheKey(serverId),
    REPO_SNAPSHOT_TTL_MS,
    async () => {
      if (projectDirectories.length === 0) return [];
      const sshParams = await loadServerSshParams(serverId);
      return discoverGitRepositories(sshParams, projectDirectories);
    },
    options,
  );
}
