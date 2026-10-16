import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchAuthorsLive, type LiveAuthorResult } from "@/lib/openalex";
import { openAlexShortId, cleanOrcid } from "@/lib/normalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type LiveSearchResult = LiveAuthorResult & {
  source: "openalex";
  unverified: true;
  alreadyInDatabase: boolean;
};

/**
 * Best-effort deduplication against stored professors.
 * If the database is unavailable, results are still returned with alreadyInDatabase=false.
 */
async function markDuplicates(authors: LiveAuthorResult[]): Promise<LiveSearchResult[]> {
  if (authors.length === 0) return [];

  const openAlexIds = authors.map((a) => a.openAlexId).filter(Boolean);
  const orcids = authors.map((a) => a.orcid).filter((id): id is string => Boolean(id));

  let existingIds = new Set<string>();
  let existingOrcids = new Set<string>();

  try {
    const matches = await prisma.professor.findMany({
      where: {
        OR: [
          openAlexIds.length ? { openAlexId: { in: openAlexIds } } : undefined,
          orcids.length ? { orcid: { in: orcids } } : undefined,
        ].filter(Boolean) as any,
      },
      select: { openAlexId: true, orcid: true },
    });
    for (const row of matches) {
      if (row.openAlexId) existingIds.add(row.openAlexId);
      if (row.orcid) existingOrcids.add(row.orcid);
    }
  } catch {
    // Best-effort: continue without dedup info if the lookup fails
  }

  return authors.map((author) => ({
    ...author,
    source: "openalex" as const,
    unverified: true as const,
    alreadyInDatabase: existingIds.has(author.openAlexId) || (author.orcid ? existingOrcids.has(author.orcid) : false),
  }));
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (raw.length < 2 || raw.length > 200) {
    return NextResponse.json({ results: [], query: raw });
  }

  const country = request.nextUrl.searchParams.get("country") || "CN";
  const institution = request.nextUrl.searchParams.get("institution") || undefined;

  try {
    const authors = await searchAuthorsLive(raw, {
      countryCode: country,
      institutionId: institution,
      perPage: 12,
    });
    const results = await markDuplicates(authors);
    return NextResponse.json({ results, query: raw, country });
  } catch (err) {
    console.error("OpenAlex live search failed:", err);
    return NextResponse.json(
      { results: [], error: "Live search temporarily unavailable", query: raw },
      { status: 502 }
    );
  }
}
