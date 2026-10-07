import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureSchema, prisma } from "@/lib/prisma";
import { scoreProgram, scoreScholarship, requirementChecklist, type FitProfile, type FitReason } from "@/lib/eligibility";

function splitReasons(reasons: FitReason[]) {
  return {
    stored: reasons.filter((reason) => reason.tone === "ok"),
    needsSource: reasons.filter((reason) => reason.tone === "warn"),
  };
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in and save your profile first." }, { status: 401 });
  }
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!student.degree && !student.major && !student.researchInterests) {
    return NextResponse.json({ error: "Add a degree, major, or research interests on your profile." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "program" ? "program" : body.kind === "scholarship" ? "scholarship" : "";
  const id = typeof body.id === "string" ? body.id : "";
  if (!kind || !id) return NextResponse.json({ error: "kind and id are required" }, { status: 400 });

  const profile: FitProfile = {
    degree: student.degree,
    major: student.major,
    interests: student.researchInterests,
    gpa: student.gpa,
    preferredUniversities: student.preferredUniversities,
    preferredCountries: student.preferredCountries,
    nationality: student.nationality,
    englishTest: student.englishTest,
  };

  if (kind === "program") {
    const program = await prisma.program.findUnique({ where: { id }, include: { university: true } });
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
    const fit = scoreProgram(profile, {
      degree: program.degree,
      major: program.major,
      universityName: program.university.name,
      deadline: program.deadline,
      gpaRequirement: program.gpaRequirement,
      englishReq: program.englishReq,
    });
    const parts = splitReasons(fit.reasons);
    return NextResponse.json({
      score: fit.score,
      verdict: "Not confirmed. Official requirements are incomplete, so this is not an eligibility decision.",
      checklist: requirementChecklist(profile, {
        degree: program.degree,
        major: program.major,
        gpaRequirement: program.gpaRequirement,
        englishReq: program.englishReq,
      }),
      ...parts,
    });
  }

  const scholarship = await prisma.scholarship.findUnique({ where: { id }, include: { university: true } });
  if (!scholarship) return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
  const fit = scoreScholarship(profile, {
    name: scholarship.name,
    type: scholarship.type,
    universityName: scholarship.university?.name,
    deadline: scholarship.deadline,
  });
  const parts = splitReasons(fit.reasons);
  return NextResponse.json({
    score: fit.score,
    verdict: "Not confirmed. Official scholarship rules are not fully stored, so this is not an eligibility decision.",
    checklist: requirementChecklist(profile, {}),
    ...parts,
  });
}
