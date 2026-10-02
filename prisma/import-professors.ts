import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type ProfIn = {
  university: string;
  name: string;
  nameZh?: string;
  position?: string;
  school?: string;
  department?: string;
  email?: string;
  profileUrl?: string;
  researchInterests?: string;
  publications?: string;
  dataStatus?: string;
};

async function main() {
  const file = path.join(process.cwd(), "data", "professors.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as ProfIn[];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.university || !row.name) {
      skipped += 1;
      console.log("skipped row missing university or name");
      continue;
    }
    const uni = await prisma.university.findFirst({ where: { name: row.university } });
    if (!uni) {
      skipped += 1;
      console.log("skipped, university not found:", row.university, row.name);
      continue;
    }

    const existing = await prisma.professor.findFirst({
      where: { universityId: uni.id, name: row.name },
    });
    const data = {
      nameZh: row.nameZh,
      position: row.position,
      school: row.school,
      department: row.department,
      email: row.email,
      profileUrl: row.profileUrl,
      researchInterests: row.researchInterests,
      publications: row.publications,
      dataStatus: row.dataStatus || "unverified",
      profileIsPersonal: false,
    };

    if (existing) {
      await prisma.professor.update({ where: { id: existing.id }, data });
      updated += 1;
      console.log("updated", row.university, row.name);
    } else {
      await prisma.professor.create({ data: { ...data, name: row.name, universityId: uni.id } });
      added += 1;
      console.log("added", row.university, row.name);
    }
  }

  console.log(`done: added ${added}, updated ${updated}, skipped ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
