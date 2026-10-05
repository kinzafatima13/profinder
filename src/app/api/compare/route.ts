import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scoreProgram } from "@/lib/eligibility";
import { consumeUsage, isPro, limitMessage } from "@/lib/billing/usage";
import { FEATURES } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

async function professorSide(id: string) {
  const professor = await prisma.professor.findUnique({
    where: { id },
    include: { university: true, researchAreas: { include: { researchArea: true } } },
  });
  if (!professor) return null;
  return {
    id: professor.id,
    name: professor.name,
    nameZh: professor.nameZh,
    university: professor.university.name,
    city: professor.university.city,
    country: professor.university.country,
    department: professor.department,
    position: professor.position,
    email: professor.email,
    verified: professor.dataStatus === "verified",
    source: professor.profileUrl,
    interests: professor.researchInterests,
    areas: professor.researchAreas.map((area) => area.researchArea.name),
    publicationCount: professor.publicationCount,
  };
}

async function universitySide(id: string) {
  const university = await prisma.university.findUnique({
    where: { id },
    include: {
      _count: { select: { professors: true, programs: true, scholarships: true } },
      scholarships: { select: { type: true, coverage: true, deadline: true, dataStatus: true } },
      programs: { select: { degree: true, major: true }, take: 6 },
    },
  });
  if (!university) return null;
  const coverage = [...new Set(university.scholarships.map((item) => item.coverage).filter(Boolean))];
  return {
    id: university.id,
    name: university.name,
    city: university.city,
    country: university.country,
    verified: university.dataStatus,
    officialUrl: university.officialUrl,
    professors: university._count.professors,
    programs: university._count.programs,
    programExamples: university.programs.map((program) => `${program.degree} ${program.major}`).join("; ") || "None stored",
    scholarships: university._count.scholarships,
    fundingLabels: coverage.join(", ") || "None stored",
    fundingAmount: "Not stored",
    deadline: "Unverified. No countdown.",
  };
}

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") === "university" ? "university" : "professor";
  const a = req.nextUrl.searchParams.get("a") || "";
  const b = req.nextUrl.searchParams.get("b") || "";
  if (!a || !b) return NextResponse.json({ error: "Choose two records." }, { status: 400 });
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const student = await prisma.student.findUnique({ where: { email: session.user.email } });
    if (student) {
      const pro = await isPro(student);
      const usage = await consumeUsage(student.id, FEATURES.COMPARISONS, pro);
      if (!usage.ok) {
        return NextResponse.json({ error: limitMessage(FEATURES.COMPARISONS, usage.used, usage.limit || 0), code: "LIMIT" }, { status: 403 });
      }
    }
  }
  const [left, right] = kind === "university"
    ? await Promise.all([universitySide(a), universitySide(b)])
    : await Promise.all([professorSide(a), professorSide(b)]);
  if (!left || !right) return NextResponse.json({ error: "One of those records was not found." }, { status: 404 });
  if (kind === "university") {
    const signedIn = await getServerSession(authOptions);
    const student = signedIn?.user?.email
      ? await prisma.student.findUnique({ where: { email: signedIn.user.email } })
      : null;
    if (student?.researchInterests) {
      for (const side of [left, right]) {
        const programs = await prisma.program.findMany({ where: { universityId: side.id }, take: 8 });
        const best = programs
          .map((program) => scoreProgram(
            {
              degree: student.degree,
              major: student.major,
              interests: student.researchInterests,
              gpa: student.gpa,
              preferredUniversities: student.preferredUniversities,
              preferredCountries: student.preferredCountries,
            },
            { degree: program.degree, major: program.major, universityName: side.name, deadline: program.deadline, gpaRequirement: program.gpaRequirement, englishReq: program.englishReq }
          ))
          .sort((a, b) => b.score - a.score)[0];
        const verifiedProfessors = await prisma.professor.count({ where: { universityId: side.id, dataStatus: "verified" } });
        Object.assign(side, {
          personalFit: best ? `${best.score}%` : "No program stored",
          fitReason: best?.reasons.find((reason) => reason.tone === "ok")?.text || best?.reasons[0]?.text || "No fit reason is stored.",
          verifiedProfessors,
          funding: "Unknown",
          deadlineCheck: "Unverified. No countdown.",
          yourFundingGoal: student.fundingGoals?.trim() || "Not saved on your profile",
        });
      }
    }
  }
  return NextResponse.json({ kind, left, right });
}
