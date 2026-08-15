import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { prisma, type WorkspaceRole } from "@watchtower/database";
import { addWorkspaceMemberSchema, createUserSchema, createWorkspaceSchema } from "@watchtower/shared";
import { notFound, badRequest, forbidden } from "../../utils/errors.js";
import { hashPassword } from "../../modules/auth/password.js";
import {
  WORKSPACE_COOKIE_NAME,
  assertWorkspaceMatch,
  canManageMembers,
  requirePlatformOwner,
  requireWorkspaceAdmin,
} from "../../modules/workspaces/context.js";

const isProduction = process.env.NODE_ENV === "production";

function setWorkspaceCookie(reply: FastifyReply, workspaceId: string) {
  reply.setCookie(WORKSPACE_COOKIE_NAME, workspaceId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    domain: isProduction ? ".watchtower.syedehsan.com" : undefined,
    maxAge: 365 * 24 * 60 * 60,
  });
}

export const workspaceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    const workspaces = request.user!.isPlatformOwner
      ? (await prisma.workspace.findMany({
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, createdAt: true, updatedAt: true },
        })).map((workspace) => ({ ...workspace, role: "OWNER" as const }))
      : (await prisma.workspaceMember.findMany({
          where: { userId: request.user!.id },
          orderBy: { createdAt: "asc" },
          include: { workspace: { select: { id: true, name: true, createdAt: true, updatedAt: true } } },
        })).map((membership) => ({ ...membership.workspace, role: membership.role }));

    return {
      workspaces,
      activeWorkspaceId: request.workspaceId,
      isPlatformOwner: request.user!.isPlatformOwner,
    };
  });

  fastify.get("/admin", async (request) => {
    requirePlatformOwner(request);
    const [workspaces, users] = await Promise.all([
      prisma.workspace.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          memberships: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { id: true, email: true, isPlatformOwner: true } } },
          },
          _count: { select: { servers: true, services: true, incidents: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { email: "asc" },
        select: {
          id: true,
          email: true,
          isPlatformOwner: true,
          createdAt: true,
          memberships: {
            orderBy: { createdAt: "asc" },
            select: { role: true, workspace: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    return { workspaces, users };
  });

  fastify.post("/", async (request, reply) => {
    requirePlatformOwner(request);
    const body = createWorkspaceSchema.parse(request.body);
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        createdByUserId: request.user!.id,
        memberships: { create: { userId: request.user!.id, role: "OWNER" } },
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    setWorkspaceCookie(reply, workspace.id);
    reply.status(201);
    return { workspace, role: "OWNER" as const };
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request) => {
    requirePlatformOwner(request);
    const body = createWorkspaceSchema.parse(request.body);
    const existing = await prisma.workspace.findUnique({ where: { id: request.params.id }, select: { id: true } });
    if (!existing) throw notFound("Project not found");

    return {
      workspace: await prisma.workspace.update({
        where: { id: request.params.id },
        data: { name: body.name },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
      }),
    };
  });

  fastify.post("/users", async (request, reply) => {
    requirePlatformOwner(request);
    const body = createUserSchema.parse(request.body);
    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw badRequest("A user account with this email already exists");

    const user = await prisma.$transaction(async (tx) => {
      if (body.workspaceId) {
        const workspace = await tx.workspace.findUnique({ where: { id: body.workspaceId }, select: { id: true } });
        if (!workspace) throw notFound("Project not found");
      }

      return tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(body.password),
          ...(body.workspaceId
            ? { memberships: { create: { workspaceId: body.workspaceId, role: body.role as WorkspaceRole } } }
            : {}),
        },
        select: {
          id: true,
          email: true,
          isPlatformOwner: true,
          memberships: { select: { workspaceId: true, role: true } },
        },
      });
    });
    reply.status(201);
    return { user };
  });

  fastify.post<{ Params: { id: string } }>("/:id/select", async (request, reply) => {
    const workspace = await prisma.workspace.findUnique({ where: { id: request.params.id }, select: { id: true, name: true } });
    if (!workspace) throw notFound("Project not found");

    if (!request.user!.isPlatformOwner) {
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: request.user!.id } },
        select: { role: true },
      });
      if (!membership) throw notFound("Project not found");
    }

    setWorkspaceCookie(reply, workspace.id);
    return { workspace };
  });

  fastify.get<{ Params: { id: string } }>("/:id/members", async (request) => {
    assertWorkspaceMatch(request, request.params.id);
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: request.params.id },
      include: { user: { select: { id: true, email: true, isPlatformOwner: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { members };
  });

  fastify.post<{ Params: { id: string } }>("/:id/members", async (request, reply) => {
    const workspaceId = requireWorkspaceAdmin(request);
    assertWorkspaceMatch(request, request.params.id);
    if (!canManageMembers(request)) throw forbidden("Project member management is not allowed");

    const body = addWorkspaceMemberSchema.parse(request.body);
    if (!request.user!.isPlatformOwner && body.role === "ADMIN") {
      throw forbidden("Only the platform owner can assign project admins");
    }

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) throw notFound("User account not found. Create the account before adding it to a project.");

    const membership = await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: { role: body.role as WorkspaceRole },
      create: { workspaceId, userId: user.id, role: body.role as WorkspaceRole },
      include: { user: { select: { id: true, email: true, isPlatformOwner: true } } },
    });
    reply.status(201);
    return { member: membership };
  });

  fastify.patch<{ Params: { id: string; userId: string } }>("/:id/members/:userId", async (request) => {
    const workspaceId = requireWorkspaceAdmin(request);
    assertWorkspaceMatch(request, request.params.id);
    const body = addWorkspaceMemberSchema.pick({ role: true }).parse(request.body);
    if (!request.user!.isPlatformOwner && body.role === "ADMIN") {
      throw forbidden("Only the platform owner can assign project admins");
    }

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: request.params.userId } },
    });
    if (!target) throw notFound("Project member not found");
    if (target.role === "OWNER") throw badRequest("The project owner role cannot be changed");

    const member = await prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role: body.role as WorkspaceRole },
      include: { user: { select: { id: true, email: true, isPlatformOwner: true } } },
    });
    return { member };
  });

  fastify.delete<{ Params: { id: string; userId: string } }>("/:id/members/:userId", async (request, reply) => {
    const workspaceId = requireWorkspaceAdmin(request);
    assertWorkspaceMatch(request, request.params.id);
    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: request.params.userId } },
    });
    if (!target) throw notFound("Project member not found");
    if (target.role === "OWNER") throw badRequest("The project owner cannot be removed");

    await prisma.workspaceMember.delete({ where: { id: target.id } });
    reply.status(204);
  });
};
