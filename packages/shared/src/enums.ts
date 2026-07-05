export const ENVIRONMENTS = ["PRODUCTION", "STAGING", "DEVELOPMENT"] as const;
export type EnvironmentValue = (typeof ENVIRONMENTS)[number];

export const CONNECTION_STATUSES = ["ONLINE", "OFFLINE", "UNKNOWN"] as const;
export type ConnectionStatusValue = (typeof CONNECTION_STATUSES)[number];

export const MONITOR_TYPES = ["HTTP", "TCP", "SSH_RUNTIME"] as const;
export type MonitorTypeValue = (typeof MONITOR_TYPES)[number];

export const RUNTIME_TYPES = ["DOCKER", "PM2", "SYSTEMD", "EXTERNAL", "UNKNOWN"] as const;
export type RuntimeTypeValue = (typeof RUNTIME_TYPES)[number];

export const SERVICE_STATUSES = ["UP", "DOWN", "DEGRADED", "UNKNOWN"] as const;
export type ServiceStatusValue = (typeof SERVICE_STATUSES)[number];
