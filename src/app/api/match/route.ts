import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeResearchMatch } from "@/lib/matching";
import { findAcademicMatches } from "@/lib/matching/engine";
import { assessTarget, newestStoredYear } from "@/lib/professor-assessment";
import { consumeUsage, isPro, limitMessage } from "@/lib/billing/usage";
import { FEATURES } from "@/lib/billing/plans";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await getServerSession(authOptions);
    const saved = session?.user?.email
      ? await prisma.student.findUnique({ where: { email: session.user.email } })
      : null;

    const query = typeof body.query === "string" ? body.query.trim() : "";
    const student = {
      degree: body.degree || saved?.degree || null,
      major: body.major || saved?.major || null,
      researchInterests: body.researchInterests || saved?.researchInterests || null,
      skills: body.skills || saved?.skills || null,
      academicBackground: body.academicBackground || saved?.academicBackground || null,
      projects: saved?.projects || null,
      cvText: saved?.cvText || null,
    };

    if (!saved) {
      return NextResponse.json({ error: "Sign in to use professor matching. Free includes 10 searches a month." }, { status: 401 });
    }
    if (!query && !student.researchInterests && !student.major) {
      return NextResponse.json(
        { error: "Describe your goal, or add research interests or a major." },
        { status: 400 }
      );
    }
    const pro = await isPro(saved);
    const usage = await consumeUsage(saved.id, FEATURES.AI_PROFESSOR_MATCH, pro);
    if (!usage.ok) {
      return NextResponse.json({ error: limitMessage(FEATURES.AI_PROFESSOR_MATCH, usage.used, usage.limit || 0), code: "LIMIT" }, { status: 403 });
    }

    if (query || body.priority || body.country || body.funding) {
      const academic = await findAcademicMatches({
        query,
        degree: body.degree || saved?.targetDegreeLevel || saved?.degree,
        major: body.major || saved?.major,
        researchInterests: body.researchInterests || query || saved?.researchInterests,
        country: body.country || null,
        funding: body.funding || (saved?.fundingPreference ? "required" : null),
        priority: body.priority || "balanced",
        limit: pro ? 12 : 8,
      });
      return NextResponse.json({
        ...academic,
        plan: pro ? "pro" : "free",
        limited: !pro,
        usage,
        results: academic.matches.map((match) => ({
          id: match.professor.id,
          name: match.professor.name,
          position: match.professor.position,
          department: match.professor.department,
          universityName: match.university.name,
          universityCity: match.university.city,
          researchAreas: match.professor.areas,
          researchInterests: match.professor.researchInterests,
          verified: match.verificationStatus.startsWith("Verified"),
          email: match.professor.email,
          match: {
            score: match.score,
            explanation: match.reasons.join(" "),
            reasons: match.reasons,
            breakdown: Object.fromEntries(match.scoreBreakdown.map((part) => [part.key, part.score])),
          },
          academic: match,
        })),
      });
    }

    const professors = await prisma.professor.findMany({
      include: {
        university: true,
        researchAreas: { include: { researchArea: true } },
        topics: { include: { topic: true } },
      },
    });

    const results = professors
      .map((p) => {
        const match = computeResearchMatch(student, {
          researchInterests: p.researchInterests,
          department: p.department,
          position: p.position,
          publications: p.publications,
          topics: p.topics.map((t) => t.topic.name),
          researchAreas: p.researchAreas.map((r) => ({
            name: r.researchArea.name,
            keywords: r.researchArea.keywords,
          })),
        });
        return {
          id: p.id,
          name: p.name,
          nameZh: p.nameZh,
          position: p.position,
          department: p.department,
          universityName: p.university.name,
          universityCity: p.university.city,
          researchAreas: p.researchAreas.map((r) => r.researchArea.name),
          researchInterests: p.researchInterests,
          verified: p.dataStatus === "verified",
          email: p.email,
          target: assessTarget({
            matchScore: match.incomplete ? null : match.score,
            verified: p.dataStatus === "verified",
            hasEmail: Boolean(p.email?.trim()),
            newestYear: newestStoredYear(p.publications),
          }),
          match,
        };
      })
      .filter((r) => !r.match.incomplete && r.match.score >= 15)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 20);

    const limited = pro ? results : results.slice(0, 10);
    return NextResponse.json({
      count: limited.length,
      total: results.length,
      plan: pro ? "pro" : "free",
      limited: !pro,
      usage,
      results: limited,
    });
  } catch (err) {
    console.error("Match API error:", err);
    return NextResponse.json({ error: "Could not calculate matches." }, { status: 500 });
  }
}
