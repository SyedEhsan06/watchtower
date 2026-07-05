-- AlterTable
ALTER TABLE "services" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "service_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_groups_name_key" ON "service_groups"("name");

-- CreateIndex
CREATE INDEX "services_groupId_idx" ON "services"("groupId");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "service_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
