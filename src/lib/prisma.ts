import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sqliteUrl() {
  const bundled = path.join(process.cwd(), "prisma", "dev.db");
  if (process.env.VERCEL) {
    const dest = "/tmp/profinder.db";
    try {
      if (fs.existsSync(bundled) && !fs.existsSync(dest)) fs.copyFileSync(bundled, dest);
    } catch {
      // The bundled file is still tried below if the copy fails.
    }
    if (fs.existsSync(dest)) return `file:${dest}`;
  }
  return `file:${bundled.replace(/\\/g, "/")}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: sqliteUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
