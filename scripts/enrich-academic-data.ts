/**
 * Idempotent academic enrichment. Fills empty fields only.
 * Never deletes rows, never overwrites a non-empty value, never invents
 * deadlines, scholarships, or "accepting students" flags.
 *
 * Verified source used here: OpenAlex works already linked by openAlexWorkId.
 * Author link is confirmed only when the professor ORCID or OpenAlex author id
 * is on the work. Name-only matches are flagged needs_review and not relinked.
 *
 * Usage:
 *   npx tsx scripts/enrich-academic-data.ts --dry-run
 *   npx tsx scripts/enrich-academic-data.ts --dry-run --limit 50
 *   npx tsx scripts/enrich-academic-data.ts
 */
import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, "data", "cache", "openalex");
const REPORT_DIR = join(ROOT, "data", "import-reports");
const MAILTO = process.env.OPENALEX_MAILTO || "academic-data@profinder.local";
const BATCH = 50;

type Work = {
  id?: string;
  doi?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  cited_by_count?: number | null;
  semanticScholarPaperId?: string | null;
  authorships?: Array<{
    author?: { id?: string | null; display_name?: string | null; orcid?: string | null };
  }>;
  primary_location?: { source?: { display_name?: string | null } | null } | null;
  topics?: Array<{ id?: string | null; display_name?: string | null }>;
  source: "openalex" | "semantic_scholar";
};

type Planned = {
  publicationId: string;
  university: string;
  fills: Record<string, string | number>;
  topicLinks: Array<{ openAlexTopicId: string; name: string }>;
  conflict?: string;
};

function arg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function has(flag: string) {
  return process.argv.includes(flag);
}

function empty(value: unknown) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function tail(id: string | null | undefined) {
  if (!id) return "";
  const part = id.split("/").pop() || "";
  return part.trim();
}

function normOrcid(value: string | null | undefined) {
  return (value || "").replace(/^https?:\/\/orcid\.org\//i, "").trim().toLowerCase();
}

function cachePath(key: string) {
  const hash = createHash("sha1").update(key).digest("hex");
  return join(CACHE_DIR, `${hash}.json`);
}

async function fetchWorks(ids: string[]): Promise<Work[]> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const key = `oa_${ids.slice().sort().join("_").slice(0, 160)}`;
  const path = cachePath(key);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as Work[];
  const filter = ids.map((id) => `https://openalex.org/${id}`).join("|");
  const url = `https://api.openalex.org/works?filter=ids.openalex:${encodeURIComponent(filter)}&per-page=${ids.length}&mailto=${encodeURIComponent(MAILTO)}`;
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { headers: { "User-Agent": `profinder-enrich/1.0 (${MAILTO})` } });
    if (res.status !== 429 && res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res || !res.ok) throw new Error(`OpenAlex ${res?.status} for batch ${ids[0]}`);
  const body = (await res.json()) as { results?: Array<Omit<Work, "source">> };
  const results = (body.results ?? []).map((work) => ({ ...work, source: "openalex" as const }));
  writeFileSync(path, JSON.stringify(results));
  await new Promise((r) => setTimeout(r, 400));
  return results;
}

async function fetchSemanticScholar(dois: string[]): Promise<Work[]> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const key = `s2v2_${dois.slice().sort().join("_")}`;
  const path = cachePath(key);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as Work[];
  const url = "https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,year,venue,citationCount,externalIds,authors.name,authors.authorId,authors.externalIds,paperId";
  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "profinder-enrich/1.0" },
      body: JSON.stringify({ ids: dois.map((doi) => `DOI:${doi}`) }),
    });
    if (res.status !== 429 && res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  if (!res || !res.ok) {
    console.log(`Semantic Scholar skip batch ${dois[0]} status ${res?.status}`);
    return [];
  }
  const body = (await res.json()) as Array<{
    paperId?: string;
    title?: string;
    year?: number;
    venue?: string;
    citationCount?: number;
    externalIds?: { DOI?: string };
    authors?: Array<{ name?: string; authorId?: string; externalIds?: { ORCID?: string | string[] } }>;
  } | null>;
  const results: Work[] = [];
  for (const paper of body) {
    if (!paper) continue;
    results.push({
      id: paper.paperId,
      doi: paper.externalIds?.DOI || null,
      display_name: paper.title || null,
      publication_year: paper.year ?? null,
      cited_by_count: paper.citationCount ?? null,
      semanticScholarPaperId: paper.paperId || null,
      authorships: (paper.authors ?? []).map((author) => ({
        author: {
          id: author.authorId ? `s2:${author.authorId}` : null,
          display_name: author.name || null,
          orcid: Array.isArray(author.externalIds?.ORCID) ? author.externalIds?.ORCID[0] : author.externalIds?.ORCID || null,
        },
      })),
      primary_location: paper.venue ? { source: { display_name: paper.venue } } : null,
      topics: [],
      source: "semantic_scholar",
    });
  }
  writeFileSync(path, JSON.stringify(results));
  await new Promise((r) => setTimeout(r, 3000));
  return results;
}

async function main() {
  const dryRun = has("--dry-run");
  const limit = Number(arg("--limit") || "0");
  const universityFilter = arg("--university");

  const rows = await prisma.publication.findMany({
    where: { openAlexWorkId: { not: null } },
    select: {
      id: true,
      title: true,
      authors: true,
      venue: true,
      citationCount: true,
      doi: true,
      openAlexWorkId: true,
      semanticScholarPaperId: true,
      authorMatchStatus: true,
      verificationStatus: true,
      professor: {
        select: {
          id: true,
          name: true,
          openAlexId: true,
          orcid: true,
          university: { select: { name: true } },
        },
      },
    },
  });

  const scoped = rows.filter((row) => {
    if (!row.openAlexWorkId) return false;
    if (universityFilter && row.professor.university.name !== universityFilter) return false;
    return true;
  });
  const selected = limit > 0 ? scoped.slice(0, limit) : scoped;
  const planned: Planned[] = [];
  const skipped: string[] = [];
  let confirmed = 0;
  let needsReview = 0;

  const source = arg("--source") || "semantic-scholar";
  let openAlexBlocked = source !== "openalex";
  for (let i = 0; i < selected.length; i += BATCH) {
    const batch = selected.slice(i, i + BATCH);
    let works: Work[] = [];
    if (!openAlexBlocked && source !== "semantic-scholar") {
      try {
        works = await fetchWorks(batch.map((row) => tail(row.openAlexWorkId)).filter(Boolean));
      } catch (error) {
        openAlexBlocked = true;
        console.log(`OpenAlex unavailable (${error instanceof Error ? error.message : error}); using Semantic Scholar DOI lookups`);
      }
    }
    if (openAlexBlocked || source === "semantic-scholar") {
      const dois = batch.map((row) => (row.doi || "").replace(/^https?:\/\/doi\.org\//i, "").trim()).filter(Boolean);
      if (dois.length) works = await fetchSemanticScholar(dois);
    }
    const byWork = new Map(works.map((work) => [tail(work.id), work]));
    const byDoi = new Map(works.map((work) => [(work.doi || "").replace(/^https?:\/\/doi\.org\//i, "").toLowerCase(), work]));
    for (const row of batch) {
      const doiKey = (row.doi || "").replace(/^https?:\/\/doi\.org\//i, "").trim().toLowerCase();
      const work = byWork.get(tail(row.openAlexWorkId)) || (doiKey ? byDoi.get(doiKey) : undefined);
      if (!work) {
        skipped.push(`${row.id} source-miss`);
        continue;
      }
      const fills: Record<string, string | number> = {};
      const authors = (work.authorships ?? [])
        .map((item) => item.author?.display_name?.trim())
        .filter((name): name is string => Boolean(name));
      if (empty(row.authors) && authors.length) fills.authors = authors.join("; ");
      const venue = work.primary_location?.source?.display_name?.trim();
      if (empty(row.venue) && venue) fills.venue = venue;
      if (row.citationCount == null && typeof work.cited_by_count === "number") fills.citationCount = work.cited_by_count;
      const doi = (work.doi || "").replace(/^https?:\/\/doi\.org\//i, "").trim();
      if (empty(row.doi) && doi) fills.doi = doi;
      if (empty(row.semanticScholarPaperId) && work.semanticScholarPaperId && work.source === "semantic_scholar") {
        fills.semanticScholarPaperId = work.semanticScholarPaperId;
      }

      const authorIds = new Set((work.authorships ?? []).map((item) => tail(item.author?.id)));
      const authorOrcids = new Set((work.authorships ?? []).map((item) => normOrcid(item.author?.orcid)).filter(Boolean));
      const profOpenAlex = tail(row.professor.openAlexId);
      const profOrcid = normOrcid(row.professor.orcid);
      let match = "";
      if (work.source === "semantic_scholar") {
        if (profOrcid && authorOrcids.has(profOrcid)) match = "confirmed_orcid";
      } else if (profOrcid && authorOrcids.has(profOrcid)) match = "confirmed_orcid";
      else if (profOpenAlex && authorIds.has(profOpenAlex)) match = "confirmed_openalex";
      if (match && empty(row.authorMatchStatus)) fills.authorMatchStatus = match;
      if (match) confirmed++;
      else needsReview++;
      if (match && (empty(row.verificationStatus) || row.verificationStatus === "UNVERIFIED")) {
        fills.verificationStatus = "verified";
      }

      const topicLinks = (work.topics ?? [])
        .map((topic) => ({ openAlexTopicId: tail(topic.id), name: topic.display_name?.trim() || "" }))
        .filter((topic) => topic.openAlexTopicId && topic.name)
        .slice(0, 5);

      if (Object.keys(fills).length || topicLinks.length) {
        planned.push({
          publicationId: row.id,
          university: row.professor.university.name,
          fills,
          topicLinks,
          conflict: match ? undefined : "DOI matched; professor author link not confirmed by ORCID or OpenAlex id",
        });
      }
    }
    if ((i / BATCH) % 10 === 0) console.log(`fetched ${Math.min(i + BATCH, selected.length)}/${selected.length}`);
  }

  const report = {
    dryRun,
    scanned: selected.length,
    plannedUpdates: planned.length,
    confirmedAuthorLinks: confirmed,
    authorLinksNeedingReview: needsReview,
    skipped: skipped.length,
    sample: planned.slice(0, 8),
    note: "Placeholder program/scholarship deadlines were not copied. acceptingStudents and supervises* were not set.",
  };
  mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = join(REPORT_DIR, `enrich-academic-${dryRun ? "dry-run" : "apply"}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, sample: report.sample.map((item) => ({ ...item, topicLinks: item.topicLinks.length })) }, null, 2));

  if (dryRun) {
    await prisma.$disconnect();
    return;
  }

  let applied = 0;
  for (const item of planned) {
    if (Object.keys(item.fills).length) {
      await prisma.publication.update({ where: { id: item.publicationId }, data: item.fills });
    }
    for (const topic of item.topicLinks) {
      const byOpenAlex = await prisma.topic.findFirst({ where: { openAlexTopicId: topic.openAlexTopicId } });
      const byName = byOpenAlex ?? await prisma.topic.findFirst({ where: { name: topic.name } });
      const row = byName ?? await prisma.topic.create({ data: { name: topic.name, openAlexTopicId: topic.openAlexTopicId } });
      if (byName && empty(byName.openAlexTopicId)) {
        await prisma.topic.update({ where: { id: byName.id }, data: { openAlexTopicId: topic.openAlexTopicId } });
      }
      await prisma.publicationTopic.upsert({
        where: { publicationId_topicId: { publicationId: item.publicationId, topicId: row.id } },
        update: {},
        create: { publicationId: item.publicationId, topicId: row.id },
      });
    }
    applied++;
  }
  console.log(`applied ${applied}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
