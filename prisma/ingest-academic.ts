import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const BASE = "https://api.openalex.org";
const PER_UNIVERSITY = Number(process.env.INGEST_LIMIT || 40);

function shortId(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/(I\d+|A\d+|W\d+|T\d+)/);
  return match ? match[1] : value;
}

function cleanOrcid(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/i);
  return match ? match[0].toUpperCase() : null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return { firstName: displayName, lastName: undefined as string | undefined };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

async function getJson<T>(apiPath: string): Promise<T> {
  const url = new URL(BASE + apiPath);
  if (process.env.OPENALEX_MAILTO) url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);
  const res = await fetch(url, { headers: { "user-agent": "profinder-academic-import" } });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    return getJson(apiPath);
  }
  if (!res.ok) throw new Error(`OpenAlex ${res.status} ${apiPath}`);
  return res.json() as Promise<T>;
}

function abstractFromInverted(index: Record<string, number[]> | null | undefined): string | null {
  if (!index) return null;
  const pairs: [number, string][] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) pairs.push([pos, word]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs.map((p) => p[1]).join(" ").slice(0, 1200) || null;
}

async function findExisting(universityId: string, author: { openAlexId: string; orcid: string | null; name: string }) {
  if (author.orcid) {
    const byOrcid = await prisma.professor.findFirst({ where: { orcid: author.orcid } });
    if (byOrcid) return byOrcid;
  }
  const byOpenAlex = await prisma.professor.findFirst({ where: { openAlexId: author.openAlexId } });
  if (byOpenAlex) return byOpenAlex;
  const sameUni = await prisma.professor.findMany({ where: { universityId } });
  const wanted = normalizeName(author.name);
  return sameUni.find((p) => normalizeName(p.name) === wanted) || null;
}

async function main() {
  console.log("starting import");
  const file = path.join(process.cwd(), "data", "ingest-targets.json");
  const names = JSON.parse(fs.readFileSync(file, "utf8")) as string[];
  let added = 0;
  let updated = 0;

  for (const name of names) {
    const uniRow = await prisma.university.findFirst({ where: { name } });
    if (!uniRow) {
      console.log("skip, university not in database:", name);
      continue;
    }
    const inst = await getJson<{ results: { id: string; display_name: string }[] }>(
      `/institutions?search=${encodeURIComponent(name)}&per-page=1`
    );
    const institution = inst.results[0];
    if (!institution) {
      console.log("skip, OpenAlex institution not found:", name);
      continue;
    }
    const institutionId = shortId(institution.id)!;
    await prisma.university.update({ where: { id: uniRow.id }, data: { openAlexId: institutionId } });
    console.log("institution", name, institutionId);
    let uniAdded = 0;
    let uniUpdated = 0;

    const authorsRes = await getJson<{ results: any[] }>(
      `/authors?filter=${encodeURIComponent(`last_known_institutions.id:${institutionId}`)}&per-page=${PER_UNIVERSITY}&sort=cited_by_count:desc`
    );

    for (const raw of authorsRes.results) {
      const author = {
        openAlexId: shortId(raw.id)!,
        name: raw.display_name as string,
        orcid: cleanOrcid(raw.orcid || raw.ids?.orcid),
        worksCount: raw.works_count ?? null,
        topics: ((raw.topics || []) as { id: string; display_name: string }[]).slice(0, 8).map((t) => ({
          id: shortId(t.id),
          name: t.display_name,
        })),
        sourceUrl: raw.id as string,
      };
      const existing = await findExisting(uniRow.id, author);
      const namesplit = splitName(author.name);
      const data = {
        firstName: namesplit.firstName,
        lastName: namesplit.lastName,
        orcid: author.orcid,
        openAlexId: author.openAlexId,
        publicationCount: author.worksCount,
        researchInterests: existing?.researchInterests || author.topics.map((t) => t.name).join(", "),
        dataSource: existing?.dataSource || "openalex",
        dataStatus: existing?.dataStatus === "verified" ? "verified" : "unverified",
        lastSyncedAt: new Date(),
        profileUrl: existing?.profileUrl || author.sourceUrl,
      };
      const professor = existing
        ? await prisma.professor.update({ where: { id: existing.id }, data })
        : await prisma.professor.create({ data: { ...data, name: author.name, universityId: uniRow.id } });
      if (existing) { updated += 1; uniUpdated += 1; }
      else { added += 1; uniAdded += 1; }

      await prisma.professorSource.create({
        data: { professorId: professor.id, source: "openalex", externalId: author.openAlexId, sourceUrl: author.sourceUrl },
      });

      for (const topic of author.topics) {
        const row = await prisma.topic.upsert({
          where: { name: topic.name },
          update: { openAlexTopicId: topic.id },
          create: { name: topic.name, openAlexTopicId: topic.id },
        });
        await prisma.professorTopic.upsert({
          where: { professorId_topicId: { professorId: professor.id, topicId: row.id } },
          update: {},
          create: { professorId: professor.id, topicId: row.id },
        });
      }

      const worksRes = await getJson<{ results: any[] }>(
        `/works?filter=${encodeURIComponent(`authorships.author.id:${author.openAlexId}`)}&per-page=5&sort=publication_year:desc`
      );
      const works = worksRes.results.map((work) => ({
        openAlexWorkId: shortId(work.id),
        title: work.title || work.display_name || "Untitled",
        year: work.publication_year ?? null,
        doi: work.doi ?? null,
        abstract: abstractFromInverted(work.abstract_inverted_index),
        sourceUrl: work.id,
      }));
      for (const work of works) {
        const already = work.openAlexWorkId
          ? await prisma.publication.findFirst({ where: { professorId: professor.id, openAlexWorkId: work.openAlexWorkId } })
          : null;
        if (already) await prisma.publication.update({ where: { id: already.id }, data: work });
        else await prisma.publication.create({ data: { ...work, professorId: professor.id } });
      }
      const summary = works.map((w) => `${w.year || "n.d."} ${w.title}`).join("\n");
      if (summary) await prisma.professor.update({ where: { id: professor.id }, data: { publications: summary } });
      console.log(existing ? "updated" : "added", name, author.name);
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  console.log(`done: added ${added}, updated ${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

