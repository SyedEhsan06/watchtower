import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const addWorkspaceMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  workspaceId: z.string().cuid().optional(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
