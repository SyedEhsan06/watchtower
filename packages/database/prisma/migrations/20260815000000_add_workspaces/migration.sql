-- Multi-tenancy migration. Existing data is placed into one initial project.

CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

ALTER TABLE "users" ADD COLUMN "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "servers" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "service_groups" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "services" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "check_results" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "incidents" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "api_keys" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "push_subscriptions" ADD COLUMN "workspaceId" TEXT;

DO $$
DECLARE
    bootstrap_user_id TEXT;
    bootstrap_workspace_id TEXT;
BEGIN
    SELECT "id" INTO bootstrap_user_id FROM "users" ORDER BY "createdAt", "id" LIMIT 1;

    IF bootstrap_user_id IS NOT NULL THEN
        UPDATE "users" SET "isPlatformOwner" = true WHERE "id" = bootstrap_user_id;
        bootstrap_workspace_id := md5('workspace:' || clock_timestamp()::TEXT || random()::TEXT);

        INSERT INTO "workspaces" ("id", "name", "createdByUserId", "updatedAt")
        VALUES (bootstrap_workspace_id, 'Default Project', bootstrap_user_id, CURRENT_TIMESTAMP);

        INSERT INTO "workspace_members" ("id", "workspaceId", "userId", "role")
        VALUES (md5('member:' || clock_timestamp()::TEXT || random()::TEXT), bootstrap_workspace_id, bootstrap_user_id, 'OWNER');

        UPDATE "servers" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
        UPDATE "service_groups" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
        UPDATE "services" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
        UPDATE "check_results" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
        UPDATE "incidents" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
        UPDATE "audit_logs" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
        UPDATE "api_keys" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
        UPDATE "push_subscriptions" SET "workspaceId" = bootstrap_workspace_id WHERE "workspaceId" IS NULL;
    END IF;
END $$;

ALTER TABLE "servers" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "service_groups" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "services" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "check_results" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "incidents" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "api_keys" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "push_subscriptions" ALTER COLUMN "workspaceId" SET NOT NULL;

DROP INDEX "service_groups_name_key";
DROP INDEX "push_subscriptions_endpoint_key";

CREATE UNIQUE INDEX "service_groups_workspaceId_name_key" ON "service_groups"("workspaceId", "name");
CREATE UNIQUE INDEX "push_subscriptions_workspaceId_endpoint_key" ON "push_subscriptions"("workspaceId", "endpoint");

CREATE INDEX "workspaces_createdByUserId_idx" ON "workspaces"("createdByUserId");
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");
CREATE INDEX "servers_workspaceId_idx" ON "servers"("workspaceId");
CREATE INDEX "service_groups_workspaceId_idx" ON "service_groups"("workspaceId");
CREATE INDEX "services_workspaceId_idx" ON "services"("workspaceId");
CREATE INDEX "check_results_workspaceId_idx" ON "check_results"("workspaceId");
CREATE INDEX "incidents_workspaceId_idx" ON "incidents"("workspaceId");
CREATE INDEX "audit_logs_workspaceId_idx" ON "audit_logs"("workspaceId");
CREATE INDEX "api_keys_workspaceId_idx" ON "api_keys"("workspaceId");
CREATE INDEX "push_subscriptions_workspaceId_idx" ON "push_subscriptions"("workspaceId");

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "servers" ADD CONSTRAINT "servers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_groups" ADD CONSTRAINT "service_groups_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "check_results" ADD CONSTRAINT "check_results_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
