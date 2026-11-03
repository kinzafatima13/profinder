/**
 * Read-only academic-data inventory.
 *
 * This script performs SELECT/count queries only. It refuses to run without an
 * explicit opt-in and an exact expected SQLite file path. It intentionally
 * refuses Vercel because the app runtime copies its bundled database to /tmp
 * and this audit must not be mistaken for an audit of a persistent Neon DB.
 *
 * Example:
 * npx tsx scripts/audit-academic-data.ts --allow-read-only-audit --expected-target=sqlite:/absolute/path/to/repo/prisma/dev.db
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function resolveSqlitePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      "This audit is built against the current SQLite Prisma schema. Refusing a non-SQLite DATABASE_URL.",
    );
  }

  const rawPath = databaseUrl.slice("file:".length).split("?")[0];
  if (!rawPath) throw new Error("DATABASE_URL has no SQLite file path.");
  return path.resolve(process.cwd(), "prisma", rawPath);
}

async function main(): Promise<void> {
  if (!process.argv.includes("--allow-read-only-audit")) {
    throw new Error(
      "Refusing to run without --allow-read-only-audit. This tool is intended for explicit, read-only inventory only.",
    );
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Refusing to run in Vercel. The deployed app uses a bundled SQLite copy; this script cannot claim to audit a persistent Neon database.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set; no connection attempted.");

  const sqlitePath = resolveSqlitePath(databaseUrl);
  const expectedTarget = option("expected-target");
  const actualTarget = `sqlite:${sqlitePath}`;

  if (!expectedTarget) {
    throw new Error(
      "Refusing to run without --expected-target=sqlite:<absolute-file-path>. No database connection attempted.",
    );
  }
  if (expectedTarget !== actualTarget) {
    throw new Error(
      `Refusing to run: expected target does not match configured SQLite file. Expected confirmation: ${actualTarget}`,
    );
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ["error"],
  });

  try {
    // Counts and missing-source checks only; no create/update/delete/raw write calls.
    const [
      universities,
      universitiesMissingOfficialSource,
      programs,
      programsMissingSource,
      professors,
      professorsWithoutSourceRecord,
      scholarships,
      scholarshipsMissingOfficialSource,
      professorSources,
      sourceRecords,
      changeLogs,
      students,
      applications,
      savedProfessors,
      subscriptions,
      usageCounters,
      billingEvents,
      applyRequests,
      applyDocuments,
      matchFeedback,
    ] = await Promise.all([
      prisma.university.count(),
      prisma.university.count({ where: { AND: [{ sourceUrl: null }, { officialUrl: null }] } }),
      prisma.program.count(),
      prisma.program.count({ where: { AND: [{ sourceUrl: null }, { programUrl: null }] } }),
      prisma.professor.count(),
      prisma.professor.count({ where: { sources: { none: {} } } }),
      prisma.scholarship.count(),
      prisma.scholarship.count({ where: { officialUrl: null } }),
      prisma.professorSource.count(),
      prisma.sourceRecord.count(),
      prisma.changeLog.count(),
      prisma.student.count(),
      prisma.application.count(),
      prisma.savedProfessor.count(),
      prisma.subscription.count(),
      prisma.usageCounter.count(),
      prisma.billingEvent.count(),
      prisma.applyRequest.count(),
      prisma.applyDocument.count(),
      prisma.matchFeedback.count(),
    ]);

    const report = {
      auditMode: "READ_ONLY",
      databaseProvider: "sqlite",
      confirmedTarget: actualTarget,
      academicData: {
        universities,
        universitiesMissingOfficialSource,
        programs,
        programsMissingSource,
        professors,
        professorsWithoutSourceRecord,
        scholarships,
        scholarshipsMissingOfficialSource,
        professorSources,
        sourceRecords,
        changeLogs,
      },
      protectedApplicationDataCounts: {
        students,
        applications,
        savedProfessors,
        subscriptions,
        usageCounters,
        billingEvents,
        applyRequests,
        applyDocuments,
        matchFeedback,
      },
      note: "Aggregate counts only. No personal records or connection credentials are printed. No data was changed.",
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Audit failed.");
  process.exitCode = 1;
});
