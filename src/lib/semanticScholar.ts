import { fetchWithRetry } from "./academic/rateLimiter";

const BASE = "https://api.semanticscholar.org/graph/v1";

async function getJson<T>(path: string): Promise<T | null> {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const headers: Record<string, string> = {
    "user-agent": "profinder-academic-import (mailto:admin@profinder.app)",
  };
  if (key) headers["x-api-key"] = key;

  return fetchWithRetry<T>(`${BASE}${path}`, { headers }, 3, 2500);
}

export async function authorByOrcid(orcid: string) {
  return getJson<{
    authorId: string;
    name: string;
    paperCount?: number;
    citationCount?: number;
    hIndex?: number;
  }>(`/author/ORCID:${encodeURIComponent(orcid)}?fields=authorId,name,paperCount,citationCount,hIndex`);
}

export async function authorPapers(authorId: string, limit = 5) {
  const res = await getJson<{
    data: {
      paperId: string;
      title: string;
      year?: number;
      venue?: string;
      abstract?: string;
      citationCount?: number;
      externalIds?: {
        DOI?: string;
        ArXiv?: string;
      };
      authors?: { name: string }[];
    }[];
  }>(`/author/${encodeURIComponent(authorId)}/papers?fields=paperId,title,year,venue,abstract,citationCount,externalIds,authors&limit=${limit}`);

  if (!res?.data) return [];

  return res.data.map((p) => ({
    semanticScholarPaperId: p.paperId,
    title: p.title,
    year: p.year ?? null,
    venue: p.venue || null,
    abstract: p.abstract || null,
    citationCount: p.citationCount ?? null,
    doi: p.externalIds?.DOI || null,
    authors: (p.authors || []).map((a) => a.name).join(", ") || null,
    sourceUrl: `https://www.semanticscholar.org/paper/${p.paperId}`,
  }));
}

export async function paperByDoi(doi: string) {
  return getJson<{
    paperId: string;
    title: string;
    year?: number;
    venue?: string;
    abstract?: string;
    citationCount?: number;
    authors?: { name: string }[];
  }>(`/paper/DOI:${encodeURIComponent(doi)}?fields=paperId,title,year,venue,abstract,citationCount,authors`);
}
