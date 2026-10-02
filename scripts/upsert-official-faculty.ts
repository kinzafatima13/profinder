/**
 * Upsert professors extracted from official faculty pages.
 * Does not delete universities, programs, scholarships, or existing professors.
 *
 * Usage: npx tsx scripts/upsert-official-faculty.ts data/import-reports/faculty-test-5.json
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  name: string;
  university: string;
  school?: string | null;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  profileUrl?: string | null;
  researchInterests?: string | null;
  supervisor_status?: string | null;
  source_url?: string | null;
  verification_status?: string | null;
};

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass the faculty JSON path");
  const payload = JSON.parse(readFileSync(file, "utf8")) as { records?: Record<string, Row[]> };
  const groups = payload.records ?? {};
  const report: Record<string, { added: number; updated: number; skipped: number }> = {};

  for (const [universityName, rows] of Object.entries(groups)) {
    const university = await prisma.university.findFirst({ where: { name: universityName } });
    report[universityName] = { added: 0, updated: 0, skipped: 0 };
    if (!university) {
      report[universityName].skipped = rows.length;
      console.log(`SKIP ${universityName}: university not in database`);
      continue;
    }
    for (const row of rows) {
      if (!row.name) {
        report[universityName].skipped++;
        continue;
      }
      const existing = row.profileUrl
        ? await prisma.professor.findFirst({ where: { universityId: university.id, profileUrl: row.profileUrl } })
        : await prisma.professor.findFirst({ where: { universityId: university.id, name: row.name } });
      const data = {
        name: row.name,
        school: row.school ?? row.department ?? null,
        department: row.department ?? null,
        position: row.position ?? null,
        email: row.email ?? null,
        profileUrl: row.profileUrl ?? row.source_url ?? null,
        researchInterests: row.researchInterests ?? null,
        dataStatus: row.verification_status === "verified" ? "verified" : "needs_review",
        dataSource: row.source_url ?? "official_faculty_page",
        lastSyncedAt: new Date(),
      };
      if (existing) {
        await prisma.professor.update({
          where: { id: existing.id },
          data: {
            ...data,
            email: existing.email || data.email,
            researchInterests: existing.researchInterests || data.researchInterests,
          },
        });
        report[universityName].updated++;
      } else {
        await prisma.professor.create({ data: { ...data, universityId: university.id } });
        report[universityName].added++;
      }
    }
  }
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
