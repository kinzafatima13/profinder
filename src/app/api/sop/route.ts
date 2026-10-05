import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { draftSop } from "@/lib/writing";

function firstPaper(value: string | null | undefined) {
  const line = value?.split(/\n+/).map((part) => part.replace(/^\d+\.\s*/, "").trim()).find(Boolean);
  return line || null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to draft a statement." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });

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

  const application = await prisma.application.findFirst({
    where: { studentId: student.id, professorId },
    select: { programName: true },
  });
  const storedPaper = professor.dataStatus === "verified"
    ? professor.publicationRows[0]?.title || firstPaper(professor.publications)
    : firstPaper(professor.publications);

  const draft = draftSop({
    studentName: student.name,
    studentDegree: student.degree,
    studentMajor: student.major,
    studentInterests: student.researchInterests,
    studentBackground: student.academicBackground,
    studentProjects: student.projects,
    studentSkills: student.skills,
    englishTest: student.englishTest,
    professorName: professor.name,
    universityName: professor.university.name,
    programName: application?.programName,
    professorInterests: professor.researchInterests,
    researchAreas: professor.researchAreas.map((area) => area.researchArea.name),
    storedPaper,
  });
  if (draft.missing.length) {
    return NextResponse.json({ error: `Complete your profile first: ${draft.missing.join(", ")}.`, missing: draft.missing }, { status: 400 });
  }
  return NextResponse.json(draft);
}
