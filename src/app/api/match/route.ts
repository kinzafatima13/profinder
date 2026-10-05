import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeResearchMatch } from "@/lib/matching";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await getServerSession(authOptions);
    const saved = session?.user?.email
      ? await prisma.student.findUnique({ where: { email: session.user.email } })
      : null;

    const student = {
      degree: body.degree || saved?.degree || null,
      major: body.major || saved?.major || null,
      researchInterests: body.researchInterests || saved?.researchInterests || null,
      skills: body.skills || saved?.skills || null,
      academicBackground: body.academicBackground || saved?.academicBackground || null,
      projects: saved?.projects || null,
      cvText: saved?.cvText || null,
    };

    if (!student.researchInterests && !student.major) {
      return NextResponse.json(
        { error: "Add research interests or a major in your profile or this form." },
        { status: 400 }
      );
    }

    const professors = await prisma.professor.findMany({
      include: {
        university: true,
        researchAreas: { include: { researchArea: true } },
        topics: { include: { topic: true } },
      },
    });

    const results = professors
      .map((p) => ({
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
        match: computeResearchMatch(student, {
          researchInterests: p.researchInterests,
          department: p.department,
          position: p.position,
          publications: p.publications,
          topics: p.topics.map((t) => t.topic.name),
          researchAreas: p.researchAreas.map((r) => ({
            name: r.researchArea.name,
            keywords: r.researchArea.keywords,
          })),
        }),
      }))
      .filter((r) => !r.match.incomplete && r.match.score >= 15)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 20);

    const sessionPlan = saved?.plan === "pro" ? "pro" : "free";
    const limited = sessionPlan === "pro" ? results : results.slice(0, 3);
    return NextResponse.json({
      count: limited.length,
      total: results.length,
      plan: sessionPlan,
      limited: sessionPlan !== "pro",
      results: limited,
    });
  } catch (err) {
    console.error("Match API error:", err);
    return NextResponse.json({ error: "Could not calculate matches." }, { status: 500 });
  }
}
