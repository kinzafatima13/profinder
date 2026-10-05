import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { draftProposal } from "@/lib/proposal";
import { consumeUsage, isPro, limitMessage } from "@/lib/billing/usage";
import { FEATURES } from "@/lib/billing/plans";

function firstPaper(value: string | null | undefined) {
  const line = value?.split(/\n+/).map((part) => part.replace(/^\d+\.\s*/, "").trim()).find(Boolean);
  return line || null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in to draft a proposal." }, { status: 401 });
  }
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const pro = await isPro(student);
  const usage = await consumeUsage(student.id, FEATURES.AI_OUTREACH, pro);
  if (!usage.ok) return NextResponse.json({ error: limitMessage(FEATURES.AI_OUTREACH, usage.used, usage.limit || 0), code: "LIMIT" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const professorId = typeof body.professorId === "string" ? body.professorId : "";
  if (!professorId) return NextResponse.json({ error: "professorId required" }, { status: 400 });

  const professor = await prisma.professor.findUnique({
    where: { id: professorId },
    include: {
      university: true,
      researchAreas: { include: { researchArea: true } },
      publicationRows: { orderBy: { year: "desc" }, take: 1 },
    },
  });
  if (!professor) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

  const storedPaper = professor.dataStatus === "verified"
    ? professor.publicationRows[0]?.title || firstPaper(professor.publications)
    : firstPaper(professor.publications);

  const draft = draftProposal({
    studentName: student.name,
    studentDegree: student.degree,
    studentMajor: student.major,
    studentInterests: student.researchInterests,
    studentBackground: student.academicBackground,
    studentProjects: student.projects,
    studentSkills: student.skills,
    professorName: professor.name,
    universityName: professor.university.name,
    professorInterests: professor.researchInterests,
    researchAreas: professor.researchAreas.map((area) => area.researchArea.name),
    storedPaper,
  });

  if (draft.missing.length) {
    return NextResponse.json(
      { error: `Complete your profile first: ${draft.missing.join(", ")}.`, missing: draft.missing },
      { status: 400 }
    );
  }

  return NextResponse.json(draft);
}
