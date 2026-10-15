/**
 * Fetch ~900+ additional supervisors across many fields for existing universities via OpenAlex.
 * Covers CS, Engineering, Biology, Chemistry, Agriculture, Medicine, etc.
 * Adds research interests (topics) + recent publications.
 * Never invents emails. Marks all as unverified.
 *
 * Usage:
 *   npx tsx scripts/enrich-900-supervisors.ts --max 900 --dry-run
 *   CONFIRM_ENRICH=yes npx tsx scripts/enrich-900-supervisors.ts --max 1200
 */
import { PrismaClient } from "@prisma/client";
import { authorsAtInstitution, recentWorks, findInstitution } from "../src/lib/openalex";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const TARGET = 900;
const PER_UNI_PER_FIELD = 4;
// OpenAlex field IDs (common ones)
const FIELDS = [
  "fields/17", // Computer Science
  "fields/16", // Engineering
  "fields/11", // Biology
  "fields/12", // Chemistry
  "fields/13", // Physics
  "fields/14", // Mathematics
  "fields/22", // Medicine
  "fields/23", // Agricultural and Biological Sciences (approx)
  "fields/20", // Environmental Science
  "fields/18", // Economics
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const max = process.argv.includes("--max")
    ? parseInt(process.argv[process.argv.indexOf("--max") + 1], 10)
    : TARGET;

  if (!dryRun && process.env.CONFIRM_ENRICH !== "yes") {
    console.error("Set CONFIRM_ENRICH=yes or use --dry-run");
    process.exit(1);
  }

  const unis = await prisma.university.findMany({
    select: { id: true, name: true, openAlexId: true },
  });

  console.log(`Loaded ${unis.length} universities. Target: ${max} new supervisors across ${FIELDS.length} fields.`);

  const report: any[] = [];
  let added = 0;

  for (const uni of unis) {
    if (added >= max) break;
    let openAlexId = uni.openAlexId;
    if (!openAlexId) {
      const inst = await findInstitution(uni.name);
      if (inst) openAlexId = inst.id;
    }
    if (!openAlexId) {
      console.log(`Skip ${uni.name}: no OpenAlex ID`);
      continue;
    }

    for (const field of FIELDS) {
      if (added >= max) break;
      try {
        const authors = await authorsAtInstitution(openAlexId, PER_UNI_PER_FIELD, 1, field);
        for (const a of authors) {
          if (added >= max) break;
          const existing = await prisma.professor.findFirst({
            where: { universityId: uni.id, OR: [{ name: a.name }, { openAlexId: a.openAlexId }] },
          });
          if (existing) continue;

          const works = await recentWorks(a.openAlexId, 5);
          const interests = a.topics.map((t) => t.name).join(", ");

          const payload = {
            name: a.name,
            universityId: uni.id,
            openAlexId: a.openAlexId,
            orcid: a.orcid,
            researchInterests: interests || null,
            dataStatus: "unverified",
            dataSource: "openalex",
            profileUrl: a.sourceUrl,
            lastSyncedAt: new Date(),
          };

          if (!dryRun) {
            const prof = await prisma.professor.create({ data: payload });
            for (const w of works) {
              await prisma.publication.create({
                data: {
                  professorId: prof.id,
                  title: w.title,
                  year: w.year,
                  authors: w.authors,
                  venue: w.venue,
                  citationCount: w.citationCount,
                  abstract: w.abstract,
                  doi: w.doi,
                  openAlexWorkId: w.openAlexWorkId,
                  sourceUrl: w.sourceUrl,
                },
              });
            }
          }

          report.push({
            university: uni.name,
            name: a.name,
            field,
            interests,
            publications: works.length,
            openAlexId: a.openAlexId,
          });
          added++;
          console.log(`[${added}/${max}] ${uni.name} — ${a.name} (${field}, ${works.length} pubs)`);
        }
      } catch (e) {
        console.error(`Error for ${uni.name} field ${field}:`, e);
      }
    }
  }

  const out = path.join("data", "enrich-900-report.json");
  fs.writeFileSync(out, JSON.stringify({ added, report }, null, 2));
  console.log(`Done. Added ${added}. Report: ${out}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
