import { describe, expect, it } from "vitest";
import { assertWorkspaceMatch, requirePlatformOwner, requireWorkspaceAdmin } from "./context.js";

function request(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: "project-a",
    workspaceRole: "MEMBER",
    user: { isPlatformOwner: false },
    ...overrides,
  } as never;
}

describe("workspace authorization", () => {
  it("allows project admins to manage their active project", () => {
    expect(requireWorkspaceAdmin(request({ workspaceRole: "ADMIN" }))).toBe("project-a");
  });

  it("allows the platform owner to manage every selected project", () => {
    expect(requireWorkspaceAdmin(request({ user: { isPlatformOwner: true } }))).toBe("project-a");
    expect(() => requirePlatformOwner(request({ user: { isPlatformOwner: true } }))).not.toThrow();
  });

  it("denies regular project members from admin operations", () => {
    expect(() => requireWorkspaceAdmin(request())).toThrow("Project admin access is required");
    expect(() => requirePlatformOwner(request())).toThrow("Platform owner access is required");
  });

  it("does not allow a selected project to be addressed through another project id", () => {
    expect(() => assertWorkspaceMatch(request(), "project-b")).toThrow("Project not found");
    expect(() => assertWorkspaceMatch(request(), "project-a")).not.toThrow();
  });
});
