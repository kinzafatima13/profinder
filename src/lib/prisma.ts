import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required. Configure a PostgreSQL connection string.");
  }

  if (!(url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string. SQLite fallback is disabled.");
  }

  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: getDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
