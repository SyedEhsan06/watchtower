import type {
  EnvironmentValue,
  ConnectionStatusValue,
  MonitorTypeValue,
  RuntimeTypeValue,
  ServiceStatusValue,
} from "@watchtower/shared";

export interface ServerSummary {
  id: string;
  name: string;
  description: string | null;
  host: string;
  sshPort: number;
  sshUsername: string | null;
  environment: EnvironmentValue;
  provider: string | null;
  projectDirectories: string[];
  connectionStatus: ConnectionStatusValue;
  lastConnectedAt: string | null;
  lastConnectionError: string | null;
  sshHostKeyFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { services: number };
}

export interface ServiceGroupSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { services: number };
}

export interface ServiceSummary {
  id: string;
  serverId: string | null;
  server?: { id: string; name: string; environment: EnvironmentValue } | null;
  groupId: string | null;
  group?: { id: string; name: string } | null;
  name: string;
  description: string | null;
  environment: EnvironmentValue;
  monitorType: MonitorTypeValue;
  runtimeType: RuntimeTypeValue;
  url: string | null;
  host: string | null;
  port: number | null;
  checkIntervalSeconds: number;
  failureThreshold: number;
  notificationsEnabled: boolean;
  status: ServiceStatusValue;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  consecutiveFailures: number;
  dockerContainerName: string | null;
  pm2ProcessName: string | null;
  systemdUnitName: string | null;
  workingDirectory: string | null;
  repositoryUrl: string | null;
  branch: string | null;
  lastKnownCommitSha: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentSummary {
  id: string;
  serviceId: string;
  startedAt: string;
  resolvedAt: string | null;
  initialError: string | null;
  latestError: string | null;
  durationSeconds: number | null;
  createdAt: string;
}
