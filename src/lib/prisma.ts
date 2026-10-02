import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbFile = path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: `file:${dbFile}` } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
