import { prisma } from "@/lib/prisma";
import { extractProfile, type ExtractedProfile } from "./extract";
import { rankCandidate, profileSummary, type EngineCandidate, type RankedMatch } from "./score";
import { resolveWeights, type Weights } from "./weights";

export type MatchRequest = {
  query?: string;
  degree?: string | null;
  major?: string | null;
  researchInterests?: string | null;
  country?: string | null;
  funding?: string | null;
  priority?: string | null;
  limit?: number;
};

export async function findAcademicMatches(input: MatchRequest) {
  const query = [input.query, input.researchInterests, input.major, input.degree].filter(Boolean).join(". ");
  const profile = extractProfile(query, {
    targetDegree: input.degree || null,
    backgroundField: input.major || null,
    field: input.major || null,
    researchInterests: input.researchInterests || input.query || "",
    countries: input.country ? [input.country] : [],
    fundingRequired: input.funding === "required" ? true : input.funding === "not_required" ? false : null,
  });
  const weights = resolveWeights(input.priority);
  const candidates = await loadCandidates(profile);
  const matches = candidates
    .map((candidate) => rankCandidate(profile, candidate, weights))
    .filter((item): item is RankedMatch => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit || 12);
  return {
    profile: profileSummary(profile),
    extracted: profile,
    weights,
    count: matches.length,
    note: matches.length ? "Scores use stored ProFinder records only. Missing data is labeled, not assumed." : "ProFinder does not currently have verified information that matches these constraints.",
    matches,
  };
}

async function loadCandidates(profile: ExtractedProfile): Promise<EngineCandidate[]> {
  const terms = [...profile.keywords, ...(profile.countries[0] ? [profile.countries[0]] : [])].slice(0, 6);
  const where = terms.length
    ? {
        OR: terms.flatMap((term) => [
          { researchInterests: { contains: term } },
          { researchKeywords: { contains: term } },
          { department: { contains: term } },
          { university: { country: { contains: term } } },
        ]),
      }
    : {};
  const rows = await prisma.professor.findMany({
    where,
    take: 250,
    include: {
      university: { include: { scholarships: { take: 3 } } },
      researchAreas: { include: { researchArea: true } },
      topics: { include: { topic: true } },
      publicationRows: { orderBy: { year: "desc" }, take: 5 },
      programs: { include: { program: { include: { researchAreas: { include: { researchArea: true } } } } }, take: 1 },
    },
  });
  const fallback = rows.length < 8
    ? await prisma.professor.findMany({
        take: 200,
        orderBy: { updatedAt: "desc" },
        include: {
          university: { include: { scholarships: { take: 3 } } },
          researchAreas: { include: { researchArea: true } },
          topics: { include: { topic: true } },
          publicationRows: { orderBy: { year: "desc" }, take: 5 },
          programs: { include: { program: { include: { researchAreas: { include: { researchArea: true } } } } }, take: 1 },
        },
      })
    : [];
  const seen = new Set<string>();
  return [...rows, ...fallback].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }).map(toCandidate);
}

function toCandidate(row: {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  email: string | null;
  profileUrl: string | null;
  researchInterests: string | null;
  researchKeywords: string | null;
  publications: string | null;
  verificationStatus: string;
  dataStatus: string;
  dataSource: string | null;
  university: { id: string; name: string; country: string; city: string | null; officialUrl: string | null; verificationStatus: string; scholarships: { name: string }[] };
  researchAreas: { researchArea: { name: string } }[];
  topics: { topic: { name: string } }[];
  publicationRows: { title: string; year: number | null; sourceUrl: string | null }[];
  programs: { program: { id: string; degree: string; major: string; teachingLang: string | null; sourceUrl: string | null; verificationStatus: string; gpaRequirement: string | null; researchAreas: { researchArea: { name: string } }[] } }[];
}): EngineCandidate {
  const program = row.programs[0]?.program;
  return {
    professorId: row.id,
    professorName: row.name,
    position: row.position,
    department: row.department,
    email: row.email,
    profileUrl: row.profileUrl,
    researchInterests: row.researchInterests,
    researchKeywords: row.researchKeywords,
    publications: row.publications,
    publicationTitles: row.publicationRows.map((item) => ({ title: item.title, year: item.year, sourceUrl: item.sourceUrl })),
    areas: row.researchAreas.map((item) => item.researchArea.name),
    topics: row.topics.map((item) => item.topic.name),
    verificationStatus: row.verificationStatus,
    dataStatus: row.dataStatus,
    sourceUrl: row.dataSource,
    university: {
      id: row.university.id,
      name: row.university.name,
      country: row.university.country,
      city: row.university.city,
      officialUrl: row.university.officialUrl,
      verificationStatus: row.university.verificationStatus,
    },
    program: program ? {
      id: program.id,
      degree: program.degree,
      major: program.major,
      teachingLang: program.teachingLang,
      sourceUrl: program.sourceUrl,
      verificationStatus: program.verificationStatus,
      researchAreas: program.researchAreas.map((item) => item.researchArea.name),
      gpaRequirement: program.gpaRequirement,
    } : null,
    fundingOnFile: row.university.scholarships.length > 0,
    fundingNames: row.university.scholarships.map((item) => item.name),
  };
}

export type { ExtractedProfile, Weights };
