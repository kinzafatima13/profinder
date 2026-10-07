import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

type Bucket = { field: string; discipline: string };

function classify(name: string): Bucket {
  const n = name.toLowerCase();
  const rules: Array<[RegExp, Bucket]> = [
    [/philosoph/, { field: "Humanities", discipline: "Philosophy" }],
    [/history|paleograph/, { field: "Humanities", discipline: "History" }],
    [/marx|political|national security|country and region/, { field: "Social Sciences", discipline: "Political Science" }],
    [/sociolog|social work/, { field: "Social Sciences", discipline: "Sociology" }],
    [/psycholog/, { field: "Social Sciences", discipline: "Psychology" }],
    [/education|physical education|sport/, { field: "Education", discipline: "Education" }],
    [/journal|communication/, { field: "Communication", discipline: "Journalism and Communication" }],
    [/law|juris|legal/, { field: "Law", discipline: "Law" }],
    [/account/, { field: "Business", discipline: "Accounting" }],
    [/finance/, { field: "Business", discipline: "Finance" }],
    [/economic/, { field: "Business", discipline: "Economics" }],
    [/business|mba|management|public administration|technology transfer/, { field: "Business", discipline: "Management" }],
    [/clinical medicine|basic medicine|medicine|healthcare|public health|pharmac|nursing/, { field: "Health Sciences", discipline: "Medicine and Health" }],
    [/biolog|ecolog|biomedical/, { field: "Life Sciences", discipline: "Biology" }],
    [/chemist/, { field: "Natural Sciences", discipline: "Chemistry" }],
    [/physic(?!al education)|astronom|atmospher|mechanics/, { field: "Natural Sciences", discipline: "Physics" }],
    [/mathemat|statistic/, { field: "Natural Sciences", discipline: "Mathematics and Statistics" }],
    [/architect|urban|landscape|design|fine art|calligraphy|\bart\b/, { field: "Arts and Design", discipline: "Architecture and Design" }],
    [/computer|software|cyberspace|intelligence science|integrated circuit|information and communication|electronic/, { field: "Information Sciences", discipline: "Computer and Information Science" }],
    [/civil|hydraulic|transport|mechanical|electrical|power|energy|nuclear|material|chemical engineering|environment|aero|aerospace|optical|instrument|control science|safety science|industrial engineering|automotive|vehicle|low altitude/, { field: "Engineering", discipline: "Engineering" }],
    [/language|literature|foreign language/, { field: "Humanities", discipline: "Languages and Literature" }],
  ];
  for (const [pattern, bucket] of rules) {
    if (pattern.test(n)) return bucket;
  }
  return { field: "Needs classification", discipline: "Unclassified official titles" };
}

const ALIASES: Array<{ term: string; normalized: string; kind: "field" | "discipline" | "major"; target: string }> = [
  { term: "CS", normalized: "cs", kind: "major", target: "Computer Science and Technology" },
  { term: "computer science", normalized: "computer science", kind: "major", target: "Computer Science and Technology" },
  { term: "AI", normalized: "ai", kind: "field", target: "Information Sciences" },
  { term: "artificial intelligence", normalized: "artificial intelligence", kind: "major", target: "Intelligence Science and Technology" },
  { term: "agri", normalized: "agri", kind: "field", target: "Life Sciences" },
  { term: "medicine", normalized: "medicine", kind: "discipline", target: "Medicine and Health" },
  { term: "finance", normalized: "finance", kind: "discipline", target: "Finance" },
  { term: "mech", normalized: "mech", kind: "major", target: "Mechanical Engineering" },
  { term: "bio chem", normalized: "bio chem", kind: "discipline", target: "Chemistry" },
  { term: "biochemistry", normalized: "biochemistry", kind: "discipline", target: "Chemistry" },
];

async function upsertTaxonomy(name: string, sourceUrl: string | null, status: string) {
  const bucket = classify(name);
  const fieldStatus = bucket.field === "Needs classification" ? "PENDING_REVIEW" : status;
  const field = await prisma.academicField.upsert({
    where: { name: bucket.field },
    update: {},
    create: {
      name: bucket.field,
      slug: slugify(bucket.field),
      verificationStatus: fieldStatus,
      sourceUrl,
      description: "Normalized field used for browse. Official program titles are stored separately.",
    },
  });
  const discipline = await prisma.discipline.upsert({
    where: { academicFieldId_name: { academicFieldId: field.id, name: bucket.discipline } },
    update: {},
    create: {
      academicFieldId: field.id,
      name: bucket.discipline,
      slug: slugify(`${bucket.field}-${bucket.discipline}`),
      verificationStatus: fieldStatus,
      sourceUrl,
    },
  });
  const major = await prisma.major.upsert({
    where: { disciplineId_name: { disciplineId: discipline.id, name } },
    update: { officialName: name, sourceUrl: sourceUrl || undefined, verificationStatus: status },
    create: {
      disciplineId: discipline.id,
      name,
      officialName: name,
      slug: slugify(name),
      sourceUrl,
      verificationStatus: status,
    },
  });
  return { field, discipline, major };
}

async function main() {
  const existing = await prisma.program.findMany({
    select: { id: true, major: true, universityId: true, degree: true },
  });
  for (const program of existing) {
    const tax = await upsertTaxonomy(program.major, null, "PENDING_REVIEW");
    await prisma.program.update({
      where: { id: program.id },
      data: {
        academicFieldId: tax.field.id,
        disciplineId: tax.discipline.id,
        majorId: tax.major.id,
        officialName: program.major,
        degreeLevel: program.degree,
        verificationStatus: "UNVERIFIED",
      },
    });
  }

  const officialDir = join(process.cwd(), "data", "official");
  const files = readdirSync(officialDir).filter((file) => file.endsWith(".json"));
  let imported = 0;
  for (const file of files) {
    const rows = JSON.parse(readFileSync(join(officialDir, file), "utf8")) as Array<{
      name: string;
      degree: string;
      sourceUrl: string;
      verificationStatus?: string;
      university?: string;
    }>;
    const universityName = file.startsWith("tsinghua") ? "Tsinghua University" : rows[0]?.university;
    if (!universityName) continue;
    const university = await prisma.university.findFirst({ where: { name: universityName } });
    if (!university) {
      await prisma.changeLog.create({
        data: {
          entityType: "University",
          entityId: universityName,
          changeType: "SOURCE_UNIVERSITY_MISSING",
          sourceUrl: rows[0]?.sourceUrl,
          afterJson: JSON.stringify({ file }),
        },
      });
      continue;
    }
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.name || !row.degree || !row.sourceUrl) continue;
      const status = row.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING_REVIEW";
      const tax = await upsertTaxonomy(row.name, row.sourceUrl, status);
      const key = `${row.degree}::${row.name}`;
      seen.add(key);
      const existingProgram = await prisma.program.findFirst({
        where: { universityId: university.id, degree: row.degree, major: row.name },
      });
      if (existingProgram) {
        await prisma.program.update({
          where: { id: existingProgram.id },
          data: {
            academicFieldId: tax.field.id,
            disciplineId: tax.discipline.id,
            majorId: tax.major.id,
            officialName: row.name,
            sourceUrl: row.sourceUrl,
            verificationStatus: status,
            lastCheckedAt: new Date(),
            lastVerifiedAt: status === "VERIFIED" ? new Date() : null,
            confidence: status === "VERIFIED" ? 0.9 : 0.4,
          },
        });
      } else {
        await prisma.program.create({
          data: {
            universityId: university.id,
            degree: row.degree,
            major: row.name,
            officialName: row.name,
            degreeLevel: row.degree,
            academicFieldId: tax.field.id,
            disciplineId: tax.discipline.id,
            majorId: tax.major.id,
            sourceUrl: row.sourceUrl,
            programUrl: row.sourceUrl,
            verificationStatus: status,
            lastCheckedAt: new Date(),
            lastVerifiedAt: status === "VERIFIED" ? new Date() : null,
            confidence: status === "VERIFIED" ? 0.9 : 0.4,
          },
        });
        imported++;
        await prisma.changeLog.create({
          data: {
            entityType: "Program",
            entityId: `${university.id}:${key}`,
            changeType: "NEW_OFFICIAL_PROGRAM",
            sourceUrl: row.sourceUrl,
            afterJson: JSON.stringify({ name: row.name, degree: row.degree }),
          },
        });
      }
      await prisma.sourceRecord.upsert({
        where: { id: `src-${slugify(university.name)}-${slugify(row.degree)}-${slugify(row.name)}` },
        update: { checkedAt: new Date(), verificationStatus: status, url: row.sourceUrl },
        create: {
          id: `src-${slugify(university.name)}-${slugify(row.degree)}-${slugify(row.name)}`,
          entityType: "Program",
          entityId: `${university.id}:${key}`,
          url: row.sourceUrl,
          sourceType: "official_university_page",
          verificationStatus: status,
          checkedAt: new Date(),
          verifiedAt: status === "VERIFIED" ? new Date() : null,
          confidence: status === "VERIFIED" ? 0.9 : 0.4,
        },
      });
    }
  }

  for (const alias of ALIASES) {
    const major = alias.kind === "major" ? await prisma.major.findFirst({ where: { name: alias.target } }) : null;
    const discipline = alias.kind === "discipline" ? await prisma.discipline.findFirst({ where: { name: alias.target } }) : null;
    const field = alias.kind === "field" ? await prisma.academicField.findFirst({ where: { name: alias.target } }) : null;
    if (!major && !discipline && !field) continue;
    await prisma.academicAlias.upsert({
      where: { normalizedTerm_kind: { normalizedTerm: alias.normalized, kind: alias.kind } },
      update: { term: alias.term, majorId: major?.id, disciplineId: discipline?.id, academicFieldId: field?.id },
      create: {
        term: alias.term,
        normalizedTerm: alias.normalized,
        kind: alias.kind,
        majorId: major?.id,
        disciplineId: discipline?.id,
        academicFieldId: field?.id,
      },
    });
  }

  const [fields, disciplines, majors, programs] = await Promise.all([
    prisma.academicField.count(),
    prisma.discipline.count(),
    prisma.major.count(),
    prisma.program.count(),
  ]);
  console.log(JSON.stringify({ fields, disciplines, majors, programs, importedOfficialPrograms: imported }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
