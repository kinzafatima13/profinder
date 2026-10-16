import { NextRequest, NextResponse } from "next/server";
import { searchAuthors } from "@/lib/openalex";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("q")?.trim() || "";
    const country = request.nextUrl.searchParams.get("country")?.trim() || "CN";
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitRaw || "10", 10) || 10, 1), 25);

    if (raw.length < 2 || raw.length > 120) {
      return NextResponse.json({ results: [], query: raw, source: "OpenAlex", note: "Query must be 2-120 characters" }, { status: 400 });
    }

    // Read-only: never writes to the database.
    const results = await searchAuthors(raw, country === "any" ? undefined : country, limit);

    return NextResponse.json({
      results,
      query: raw,
      country: country === "any" ? null : country,
      source: "OpenAlex",
      verificationStatus: "UNVERIFIED",
      note: "Live results from OpenAlex. Not independently verified. No emails or affiliation claims are invented. Attribution required.",
      rateLimitNote: "OpenAlex free tier applies. Use OPENALEX_API_KEY for higher daily budget.",
    });
  } catch (err) {
    console.error("[discovery/openalex]", err);
    return NextResponse.json(
      { results: [], error: "Live search temporarily unavailable", source: "OpenAlex" },
      { status: 503 }
    );
  }
}
