import { cleanOrcid, openAlexShortId } from "./normalize";
import { fetchWithRetry } from "./academic/rateLimiter";

const BASE = "https://api.openalex.org";

export type OpenAlexAuthor = {
  id: string;
  display_name: string;
  orcid?: string | null;
  works_count?: number;
  last_known_institutions?: { id: string; display_name: string; country_code?: string }[];
  topics?: { id: string; display_name: string }[];
  ids?: { openalex?: string; orcid?: string };
};

export type OpenAlexWork = {
  id: string;
  display_name?: string;
  title?: string;
  publication_year?: number;
  doi?: string | null;
  cited_by_count?: number;
  primary_location?: {
    source?: {
      display_name?: string;
    } | null;
  } | null;
  authorships?: {
    author: {
      display_name: string;
    };
  }[];
  abstract_inverted_index?: Record<string, number[]> | null;
};

function mailto() {
  return process.env.OPENALEX_MAILTO || "admin@profinder.app";
}

async function getJson<T>(path: string): Promise<T | null> {
  const url = new URL(BASE + path);
  if (process.env.OPENALEX_API_KEY) {
    url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  } else if (mailto()) {
    url.searchParams.set("mailto", mailto());
  }
  return fetchWithRetry<T>(url.toString(), {
    headers: { "user-agent": "profinder-academic-import (mailto:admin@profinder.app)" },
  });
}

export async function findInstitution(name: string) {
  const data = await getJson<{ results: { id: string; display_name: string; country_code?: string; homepage_url?: string }[] }>(
    `/institutions?search=${encodeURIComponent(name)}&per-page=1`
  );
  const hit = data?.results?.[0];
  if (!hit) return null;
  return {
    id: openAlexShortId(hit.id)!,
    name: hit.display_name,
    url: hit.id,
    countryCode: hit.country_code ?? null,
    homepageUrl: hit.homepage_url ?? null,
  };
}

export async function searchAuthorAtInstitution(name: string, institutionId: string) {
  const filter = `last_known_institutions.id:${institutionId}`;
  const data = await getJson<{ results: OpenAlexAuthor[] }>(
    `/authors?search=${encodeURIComponent(name)}&filter=${encodeURIComponent(filter)}&per-page=3`
  );
  if (!data?.results?.length) return null;
  const raw = data.results[0];
  return {
    openAlexId: openAlexShortId(raw.id)!,
    name: raw.display_name,
    orcid: cleanOrcid(raw.orcid || raw.ids?.orcid),
    worksCount: raw.works_count ?? null,
    topics: (raw.topics || []).slice(0, 10).map((t) => ({
      id: openAlexShortId(t.id),
      name: t.display_name,
    })),
    sourceUrl: raw.id,
  };
}

export async function authorsAtInstitution(institutionId: string, perPage = 40, page = 1, fieldId = "fields/17") {
  const filter = fieldId
    ? `last_known_institutions.id:${institutionId},topics.field.id:${fieldId}`
    : `last_known_institutions.id:${institutionId}`;

  const data = await getJson<{ results: OpenAlexAuthor[] }>(
    `/authors?filter=${encodeURIComponent(filter)}&per-page=${perPage}&page=${page}&sort=cited_by_count:desc`
  );
  if (!data?.results) return [];

  return data.results.map((author) => ({
    openAlexId: openAlexShortId(author.id)!,
    name: author.display_name,
    orcid: cleanOrcid(author.orcid || author.ids?.orcid),
    worksCount: author.works_count ?? null,
    topics: (author.topics || []).slice(0, 10).map((t) => ({
      id: openAlexShortId(t.id),
      name: t.display_name,
    })),
    sourceUrl: author.id,
  }));
}

export function abstractFromInverted(index: OpenAlexWork["abstract_inverted_index"]): string | null {
  if (!index) return null;
  const pairs: [number, string][] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) pairs.push([pos, word]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  const text = pairs.map((p) => p[1]).join(" ");
  return text.slice(0, 1200) || null;
}

export async function recentWorks(authorId: string, count = 5) {
  const data = await getJson<{ results: OpenAlexWork[] }>(
    `/works?filter=${encodeURIComponent(`authorships.author.id:${authorId}`)}&per-page=${count}&sort=publication_year:desc`
  );
  if (!data?.results) return [];

  return data.results.map((work) => {
    const authors = (work.authorships || [])
      .map((a) => a.author?.display_name)
      .filter(Boolean)
      .slice(0, 10)
      .join(", ");

    return {
      openAlexWorkId: openAlexShortId(work.id),
      title: work.title || work.display_name || "Untitled",
      year: work.publication_year ?? null,
      doi: work.doi ?? null,
      authors: authors || null,
      venue: work.primary_location?.source?.display_name ?? null,
      citationCount: work.cited_by_count ?? null,
      abstract: abstractFromInverted(work.abstract_inverted_index),
      sourceUrl: work.id,
    };
  });
}
