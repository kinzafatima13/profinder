import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../src/lib/normalize";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const professors = await prisma.professor.findMany({
    select: { id: true, name: true, universityId: true, orcid: true, openAlexId: true, semanticScholarId: true, profileUrl: true, dataStatus: true, verificationStatus: true },
    orderBy: { universityId: "asc" },
  });
  const universities = await prisma.university.findMany({ select: { id: true, name: true } });
  const uniMap = new Map(universities.map((u) => [u.id, u.name]));

  const buckets = new Map<string, typeof professors>();
  const add = (key: string, p: typeof professors[number]) => {
    if (!key) return;
    const arr = buckets.get(key) || [];
    arr.push(p);
    buckets.set(key, arr);
  };

  for (const p of professors) {
    if (p.orcid) add("ORCID:" + p.orcid.trim().toLowerCase(), p);
    if (p.openAlexId) add("OPENALEX:" + p.openAlexId.trim().toLowerCase(), p);
    if (p.semanticScholarId) add("S2:" + p.semanticScholarId.trim().toLowerCase(), p);
    if (p.profileUrl) add("URL:" + p.profileUrl.trim().toLowerCase().replace(/\/$/, ""), p);
    add("UNI_NAME:" + p.universityId + ":" + normalizeName(p.name), p);
  }

  const groups = [...buckets.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      confidence: key.startsWith("ORCID:") || key.startsWith("OPENALEX:") || key.startsWith("URL:") ? "HIGH" : "REVIEW",
      rows: rows.map((p) => ({ id: p.id, name: p.name, university: uniMap.get(p.universityId), dataStatus: p.dataStatus, verificationStatus: p.verificationStatus })),
    }));

  const report = {
    professorsScanned: professors.length,
    candidateGroups: groups.length,
    highConfidenceGroups: groups.filter((g) => g.confidence === "HIGH").length,
    reviewGroups: groups.filter((g) => g.confidence === "REVIEW").length,
    note: "READ-ONLY audit. This script never deletes or merges professor records.",
    groups,
  };
  const output = process.argv.find((x) => x.startsWith("--out="))?.split("=").slice(1).join("=") || "data/duplicate-audit.json";
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ professorsScanned: report.professorsScanned, candidateGroups: report.candidateGroups, highConfidenceGroups: report.highConfidenceGroups, reviewGroups: report.reviewGroups, output }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
