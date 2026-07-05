import { z } from "zod";
import { ENVIRONMENTS } from "../enums.js";
import { isSafeAbsolutePath } from "../identifiers.js";

export const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  host: z.string().min(1).max(255),
  sshPort: z.number().int().min(1).max(65535).default(22),
  sshUsername: z.string().min(1).max(64).optional(),
  sshPrivateKey: z.string().min(1).optional(),
  environment: z.enum(ENVIRONMENTS).default("PRODUCTION"),
  provider: z.string().max(100).optional(),
  projectDirectories: z
    .array(z.string().refine(isSafeAbsolutePath, "Must be an absolute path with no traversal"))
    .default([]),
});

export type CreateServerInput = z.infer<typeof createServerSchema>;

export const updateServerSchema = createServerSchema.partial();
export type UpdateServerInput = z.infer<typeof updateServerSchema>;

export const testConnectionSchema = z.object({
  host: z.string().min(1).max(255),
  sshPort: z.number().int().min(1).max(65535).default(22),
  sshUsername: z.string().min(1).max(64),
  sshPrivateKey: z.string().min(1),
});
export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
