import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

function resolveBundledDb() {
  const candidates = [
    path.join(process.cwd(), "prisma", "dev.db"),
    path.join(process.cwd(), ".next", "server", "prisma", "dev.db"),
    "/var/task/prisma/dev.db",
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function resolveDatabaseUrl() {
  const configured = process.env.DATABASE_URL || "";
  const useWritableCopy = !configured || configured.startsWith("file:");
  if (!useWritableCopy) return configured;

  const bundled = resolveBundledDb();
  if (!process.env.VERCEL) {
    return configured || (bundled ? `file:${bundled}` : "file:./prisma/dev.db");
  }

  const target = "/tmp/profinder.db";
  if (!fs.existsSync(target)) {
    if (!bundled) throw new Error("Bundled prisma/dev.db was not included in the deployment.");
    fs.copyFileSync(bundled, target);
  }
  return `file:${target}`;
}

process.env.DATABASE_URL = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; schemaReady?: Promise<void> };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

async function addColumn(table: string, column: string, type: string) {
  const columns = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("${table}")`);
  if (columns.some((item) => item.name === column)) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
}

export function ensureSchema() {
  if (!process.env.DATABASE_URL?.startsWith("file:")) return Promise.resolve();
  if (!globalForPrisma.schemaReady) {
    globalForPrisma.schemaReady = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AcademicField" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "sourceUrl" TEXT,
        "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AcademicField_slug_key" ON "AcademicField"("slug")`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Discipline" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "academicFieldId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "sourceUrl" TEXT,
        "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Discipline_academicFieldId_fkey" FOREIGN KEY ("academicFieldId") REFERENCES "AcademicField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Discipline_slug_key" ON "Discipline"("slug")`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Major" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "disciplineId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "officialName" TEXT,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "sourceUrl" TEXT,
        "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Major_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Major_slug_key" ON "Major"("slug")`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AcademicAlias" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "term" TEXT NOT NULL,
        "normalizedTerm" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "academicFieldId" TEXT,
        "disciplineId" TEXT,
        "majorId" TEXT
      )`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AcademicAlias_normalizedTerm_kind_key" ON "AcademicAlias"("normalizedTerm", "kind")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AcademicAlias_normalizedTerm_idx" ON "AcademicAlias"("normalizedTerm")`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ProfessorMajor" (
        "professorId" TEXT NOT NULL,
        "majorId" TEXT NOT NULL,
        CONSTRAINT "ProfessorMajor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ProfessorMajor_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        PRIMARY KEY ("professorId", "majorId")
      )`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ProfessorDiscipline" (
        "professorId" TEXT NOT NULL,
        "disciplineId" TEXT NOT NULL,
        PRIMARY KEY ("professorId", "disciplineId")
      )`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ProfessorAcademicField" (
        "professorId" TEXT NOT NULL,
        "academicFieldId" TEXT NOT NULL,
        PRIMARY KEY ("professorId", "academicFieldId")
      )`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "College" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "universityId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "officialName" TEXT,
        "sourceUrl" TEXT,
        "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Department" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "universityId" TEXT NOT NULL,
        "collegeId" TEXT,
        "name" TEXT NOT NULL,
        "officialName" TEXT,
        "sourceUrl" TEXT,
        "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      for (const [column, type] of [
        ["academicFieldId", "TEXT"],
        ["disciplineId", "TEXT"],
        ["majorId", "TEXT"],
        ["collegeId", "TEXT"],
        ["departmentId", "TEXT"],
        ["officialName", "TEXT"],
        ["studyMode", "TEXT"],
        ["degreeLevel", "TEXT"],
        ["verificationStatus", "TEXT DEFAULT 'UNVERIFIED'"],
        ["lastCheckedAt", "DATETIME"],
        ["lastVerifiedAt", "DATETIME"],
        ["confidence", "REAL"],
        ["sourceUrl", "TEXT"],
      ] as const) {
        await addColumn("Program", column, type);
      }
      for (const [column, type] of [
        ["verificationStatus", "TEXT DEFAULT 'UNVERIFIED'"],
        ["lastCheckedAt", "DATETIME"],
        ["confidence", "REAL"],
      ] as const) {
        await addColumn("University", column, type);
      }
      for (const [column, type] of [
        ["verificationStatus", "TEXT DEFAULT 'UNVERIFIED'"],
        ["lastCheckedAt", "DATETIME"],
        ["lastVerifiedAt", "DATETIME"],
        ["confidence", "REAL"],
        ["collegeId", "TEXT"],
        ["departmentId", "TEXT"],
      ] as const) {
        await addColumn("Professor", column, type);
      }
      for (const [column, type] of [
        ["verificationStatus", "TEXT DEFAULT 'UNVERIFIED'"],
        ["lastCheckedAt", "DATETIME"],
        ["lastVerifiedAt", "DATETIME"],
        ["confidence", "REAL"],
      ] as const) {
        await addColumn("Scholarship", column, type);
      }
      for (const [column, type] of [
        ["collegeId", "TEXT"],
        ["departmentId", "TEXT"],
        ["currentUniversity", "TEXT"],
        ["graduationYear", "TEXT"],
        ["academicLevel", "TEXT"],
        ["publications", "TEXT"],
        ["researchExperience", "TEXT"],
        ["researchMethods", "TEXT"],
        ["tools", "TEXT"],
        ["programmingLanguages", "TEXT"],
        ["researchKeywords", "TEXT"],
        ["preferredResearchAreas", "TEXT"],
        ["targetDegreeLevel", "TEXT"],
        ["intake", "TEXT"],
        ["fundingPreference", "TEXT"],
        ["fullyFundedPreference", "TEXT"],
        ["scholarshipPreference", "TEXT"],
        ["ielts", "TEXT"],
        ["toefl", "TEXT"],
        ["pte", "TEXT"],
        ["englishProof", "TEXT"],
        ["englishTestStatus", "TEXT"],
      ] as const) {
        await addColumn("Student", column, type);
      }
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "MatchFeedback" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT,
        "query" TEXT,
        "professorId" TEXT,
        "programId" TEXT,
        "universityId" TEXT,
        "vote" TEXT NOT NULL,
        "reason" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MatchFeedback_studentId_idx" ON "MatchFeedback"("studentId")`);
    })().catch((error) => {
      globalForPrisma.schemaReady = undefined;
      throw error;
    });
  }
  return globalForPrisma.schemaReady;
}

void ensureSchema().catch((error) => {
  console.error("Schema ensure failed:", error);
});
