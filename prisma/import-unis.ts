import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type ProgramIn = {
  degree: string;
  major: string;
  teachingLang?: string;
  requirements?: string;
  deadline?: string;
  openingDate?: string;
  scholarshipDeadline?: string;
  tuition?: string;
  englishReq?: string;
  applicationUrl?: string;
};

type ScholarshipIn = {
  name: string;
  type?: string;
  requirements?: string;
  deadline?: string;
  officialUrl?: string;
  advantages?: string;
  coverage?: string;
  dataStatus?: string;
};

type UniIn = {
  name: string;
  nameZh?: string;
  country?: string;
  province?: string;
  city?: string;
  officialUrl?: string;
  description?: string;
  agencyNumber?: string;
  programs?: ProgramIn[];
  scholarships?: ScholarshipIn[];
};

async function main() {
  const file = path.join(process.cwd(), "data", "universities.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as UniIn[];
  let added = 0;
  let updated = 0;

  for (const row of rows) {
    const found = await prisma.university.findFirst({ where: { name: row.name } });
    const data = {
      nameZh: row.nameZh,
      country: row.country || "China",
      province: row.province,
      city: row.city,
      officialUrl: row.officialUrl,
      description: row.description,
      agencyNumber: row.agencyNumber,
    };
    const uni = found
      ? await prisma.university.update({ where: { id: found.id }, data })
      : await prisma.university.create({ data: { name: row.name, ...data } });
    if (found) updated += 1;
    else added += 1;

    for (const p of row.programs || []) {
      const existing = await prisma.program.findFirst({
        where: { universityId: uni.id, degree: p.degree, major: p.major },
      });
      if (existing) await prisma.program.update({ where: { id: existing.id }, data: p });
      else await prisma.program.create({ data: { ...p, universityId: uni.id } });
    }

    for (const s of row.scholarships || []) {
      const existing = await prisma.scholarship.findFirst({
        where: { universityId: uni.id, name: s.name },
      });
      const payload = { ...s, dataStatus: s.dataStatus || "unverified" };
      if (existing) await prisma.scholarship.update({ where: { id: existing.id }, data: payload });
      else await prisma.scholarship.create({ data: { ...payload, universityId: uni.id } });
    }

    console.log(found ? "updated" : "added", row.name);
  }

  console.log(`done: added ${added}, updated ${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
