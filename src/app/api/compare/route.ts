import { NextRequest, NextResponse } from "next/server";
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
  const [left, right] = kind === "university"
    ? await Promise.all([universitySide(a), universitySide(b)])
    : await Promise.all([professorSide(a), professorSide(b)]);
  if (!left || !right) return NextResponse.json({ error: "One of those records was not found." }, { status: 404 });
  return NextResponse.json({ kind, left, right });
}
