import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { inferAcademicField, inferDiscipline, normalizeAcademicName, slugifyAcademic } from "../src/lib/academic-taxonomy";

const prisma = new PrismaClient();

type Row = { name: string; degree: string; sourceUrl: string; verificationStatus?: string };

async function upsertHierarchy(universityId: string, majorName: string, sourceUrl: string) {
  const fieldName = inferAcademicField(majorName);
  const disciplineName = inferDiscipline(majorName, fieldName);
  const field = await prisma.academicField.upsert({
    where: { slug: slugifyAcademic(fieldName) },
    update: { sourceUrl },
    create: { name: fieldName, slug: slugifyAcademic(fieldName), sourceUrl, verificationStatus: "VERIFIED" },
  });
  const discipline = await prisma.discipline.upsert({
    where: { slug: slugifyAcademic(fieldName + " " + disciplineName) },
    update: { sourceUrl },
    create: { academicFieldId: field.id, name: disciplineName, slug: slugifyAcademic(fieldName + " " + disciplineName), sourceUrl, verificationStatus: "VERIFIED" },
  });
  const major = await prisma.major.upsert({
    where: { slug: slugifyAcademic(fieldName + " " + disciplineName + " " + normalizeAcademicName(majorName)) },
    update: { officialName: majorName, sourceUrl, verificationStatus: "VERIFIED" },
    create: {
      disciplineId: discipline.id,
      name: majorName,
      officialName: majorName,
      slug: slugifyAcademic(fieldName + " " + disciplineName + " " + normalizeAcademicName(majorName)),
      sourceUrl,
      verificationStatus: "VERIFIED",
    },
  });
  return { field, discipline, major };
}

async function main() {
  const file = process.argv.find((x) => x.startsWith("--file="))?.split("=").slice(1).join("=") || "data/official/tsinghua-graduate-programs.json";
  const universityName = process.argv.find((x) => x.startsWith("--university="))?.split("=").slice(1).join("=") || "Tsinghua University";
  const rows = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8")) as Row[];
  const uni = await prisma.university.findFirst({ where: { name: universityName } });
  if (!uni) throw new Error(`University not found: ${universityName}`);

  let createdOrUpdated = 0;
  for (const row of rows) {
    if (!row.name?.trim() || !row.degree?.trim() || !row.sourceUrl) continue;
    const hierarchy = await upsertHierarchy(uni.id, row.name.trim(), row.sourceUrl);
    const existing = await prisma.program.findFirst({
      where: {
        universityId: uni.id,
        degree: row.degree.trim(),
        OR: [
          { major: row.name.trim() },
          { officialName: row.name.trim() },
        ],
      },
    });
    const data = {
      officialName: row.name.trim(),
      major: row.name.trim(),
      majorId: hierarchy.major.id,
      disciplineId: hierarchy.discipline.id,
      academicFieldId: hierarchy.field.id,
      programUrl: row.sourceUrl,
      sourceUrl: row.sourceUrl,
      verificationStatus: row.verificationStatus || "VERIFIED",
      lastCheckedAt: new Date(),
      lastVerifiedAt: row.verificationStatus === "VERIFIED" ? new Date() : null,
      confidence: row.verificationStatus === "VERIFIED" ? 1 : 0.5,
    };
    if (existing) {
      await prisma.program.update({ where: { id: existing.id }, data });
    } else {
      await prisma.program.create({ data: { universityId: uni.id, degree: row.degree.trim(), ...data } });
    }
    await prisma.sourceRecord.upsert({
      where: { id: `program-${existing?.id || uni.id}-${slugifyAcademic(row.degree + "-" + row.name)}` },
      update: { url: row.sourceUrl, verificationStatus: data.verificationStatus, checkedAt: new Date(), verifiedAt: data.lastVerifiedAt, confidence: data.confidence },
      create: { id: `program-${existing?.id || uni.id}-${slugifyAcademic(row.degree + "-" + row.name)}`, entityType: "PROGRAM", entityId: existing?.id || "pending", url: row.sourceUrl, sourceType: "OFFICIAL_UNIVERSITY", verificationStatus: data.verificationStatus, checkedAt: new Date(), verifiedAt: data.lastVerifiedAt, confidence: data.confidence },
    });
    createdOrUpdated++;
  }
  console.log(JSON.stringify({ university: universityName, rows: rows.length, createdOrUpdated }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
