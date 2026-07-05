import { z } from "zod";
import { ENVIRONMENTS, MONITOR_TYPES, RUNTIME_TYPES } from "../enums.js";
import { isSafeIdentifier, isSafeSystemdUnit, isSafeAbsolutePath } from "../identifiers.js";

export const createServiceSchema = z
  .object({
    serverId: z.string().min(1).optional(),
    groupId: z.string().min(1).optional(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    environment: z.enum(ENVIRONMENTS).default("PRODUCTION"),
    monitorType: z.enum(MONITOR_TYPES),
    runtimeType: z.enum(RUNTIME_TYPES).default("UNKNOWN"),

    url: z.string().url().max(2048).optional(),
    host: z.string().max(255).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    expectedStatusCode: z.number().int().min(100).max(599).default(200),
    timeoutMs: z.number().int().min(500).max(60_000).default(5000),
    checkIntervalSeconds: z.number().int().min(10).max(86_400).default(60),
    failureThreshold: z.number().int().min(1).max(10).default(2),
    notificationsEnabled: z.boolean().default(true),

    dockerContainerName: z
      .string()
      .refine(isSafeIdentifier, "Invalid container name")
      .optional(),
    pm2ProcessName: z.string().refine(isSafeIdentifier, "Invalid process name").optional(),
    systemdUnitName: z.string().refine(isSafeSystemdUnit, "Invalid unit name").optional(),
    workingDirectory: z
      .string()
      .refine(isSafeAbsolutePath, "Must be an absolute path with no traversal")
      .optional(),

    repositoryUrl: z.string().max(500).optional(),
    repositoryName: z.string().max(200).optional(),
    branch: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.monitorType === "HTTP" && !data.url) {
      ctx.addIssue({ code: "custom", message: "url is required for HTTP monitoring", path: ["url"] });
    }
    if (data.monitorType === "TCP" && (!data.host || !data.port)) {
      ctx.addIssue({ code: "custom", message: "host and port are required for TCP monitoring", path: ["host"] });
    }
    if (data.monitorType === "SSH_RUNTIME" && !data.serverId) {
      ctx.addIssue({ code: "custom", message: "serverId is required for SSH runtime monitoring", path: ["serverId"] });
    }
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  groupId: z.string().min(1).nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  monitorType: z.enum(MONITOR_TYPES).optional(),
  runtimeType: z.enum(RUNTIME_TYPES).optional(),
  url: z.string().url().max(2048).optional(),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  expectedStatusCode: z.number().int().min(100).max(599).optional(),
  timeoutMs: z.number().int().min(500).max(60_000).optional(),
  checkIntervalSeconds: z.number().int().min(10).max(86_400).optional(),
  failureThreshold: z.number().int().min(1).max(10).optional(),
  notificationsEnabled: z.boolean().optional(),
  dockerContainerName: z.string().refine(isSafeIdentifier, "Invalid container name").optional(),
  pm2ProcessName: z.string().refine(isSafeIdentifier, "Invalid process name").optional(),
  systemdUnitName: z.string().refine(isSafeSystemdUnit, "Invalid unit name").optional(),
  workingDirectory: z.string().refine(isSafeAbsolutePath, "Must be an absolute path").optional(),
  repositoryUrl: z.string().max(500).optional(),
  repositoryName: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
