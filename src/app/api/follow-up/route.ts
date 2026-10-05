import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { draftFollowUp } from "@/lib/writing";
import { consumeUsage, isPro, limitMessage } from "@/lib/billing/usage";
import { FEATURES } from "@/lib/billing/plans";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to draft a follow-up." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const pro = await isPro(student);
  const usage = await consumeUsage(student.id, FEATURES.AI_OUTREACH, pro);
  if (!usage.ok) {
    return NextResponse.json({ error: limitMessage(FEATURES.AI_OUTREACH, usage.used, usage.limit || 0), code: "LIMIT" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const professorId = typeof body.professorId === "string" ? body.professorId : "";
  if (!professorId) return NextResponse.json({ error: "professorId required" }, { status: 400 });

  const professor = await prisma.professor.findUnique({
    where: { id: professorId },
    include: { university: true },
  });
  if (!professor) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

  const application = await prisma.application.findFirst({
    where: { studentId: student.id, professorId },
    select: { notes: true, followUpDate: true },
  });
  const draft = draftFollowUp({
    studentName: student.name,
    professorName: professor.name,
    universityName: professor.university.name,
    studentInterests: student.researchInterests,
    professorInterests: professor.researchInterests,
    notes: application?.notes,
    followUpDate: application?.followUpDate,
  });
  if (draft.missing.length) {
    return NextResponse.json({ error: `Complete your profile first: ${draft.missing.join(", ")}.` }, { status: 400 });
  }
  return NextResponse.json({
    subject: draft.subject,
    body: draft.body,
    facts: draft.facts,
    disclaimer: "Review this draft. It is not sent. It does not invent how many days have passed.",
  });
}
