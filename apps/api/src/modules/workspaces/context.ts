import type { FastifyRequest } from "fastify";
import type { WorkspaceRole } from "@watchtower/database";
import { forbidden, notFound } from "../../utils/errors.js";

export const WORKSPACE_COOKIE_NAME = "watchtower_workspace";

export function requireWorkspaceId(request: FastifyRequest): string {
  if (!request.workspaceId) throw forbidden("Select a project before continuing");
  return request.workspaceId;
}

export function requireWorkspaceAdmin(request: FastifyRequest): string {
  const workspaceId = requireWorkspaceId(request);
  if (!request.user?.isPlatformOwner && request.workspaceRole !== "OWNER" && request.workspaceRole !== "ADMIN") {
    throw forbidden("Project admin access is required");
  }
  return workspaceId;
}

export function requirePlatformOwner(request: FastifyRequest): void {
  if (!request.user?.isPlatformOwner) throw forbidden("Platform owner access is required");
}

export function assertWorkspaceMatch(request: FastifyRequest, workspaceId: string): void {
  if (requireWorkspaceId(request) !== workspaceId) throw notFound("Project not found");
}

export function canManageMembers(request: FastifyRequest): boolean {
  return Boolean(
    request.user?.isPlatformOwner ||
      request.workspaceRole === ("OWNER" satisfies WorkspaceRole) ||
      request.workspaceRole === ("ADMIN" satisfies WorkspaceRole)
  );
}
