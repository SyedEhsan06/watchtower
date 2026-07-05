import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __watchtowerPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__watchtowerPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__watchtowerPrisma = prisma;
}

export * from "@prisma/client";
