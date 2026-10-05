import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const areas = await prisma.researchArea.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { keywords: { contains: q } }, { description: { contains: q } }] }
      : undefined,
    orderBy: { name: "asc" },
  });

  if (q.length < 2) {
    return NextResponse.json({ query: q, areas, professors: [], programs: [], universities: [] });
  }

  const professors = await prisma.professor.findMany({
    where: {
      OR: [
        { researchInterests: { contains: q } },
        { department: { contains: q } },
        { school: { contains: q } },
        { researchAreas: { some: { researchArea: { name: { contains: q } } } } },
      ],
    },
    include: {
      university: { select: { id: true, name: true, city: true } },
      researchAreas: { include: { researchArea: true } },
    },
    orderBy: [{ dataStatus: "desc" }, { name: "asc" }],
    take: 12,
  });

  const programs = await prisma.program.findMany({
    where: { OR: [{ major: { contains: q } }, { degree: { contains: q } }] },
    include: { university: { select: { id: true, name: true } } },
    take: 8,
  });

  const universities = new Map<string, { id: string; name: string; city: string | null }>();
  for (const professor of professors) {
    universities.set(professor.university.id, professor.university);
  }

  return NextResponse.json({
    query: q,
    areas,
    universities: [...universities.values()],
    programs: programs.map((program) => ({
      id: program.id,
      universityId: program.university.id,
      university: program.university.name,
      degree: program.degree,
      major: program.major,
      deadline: program.deadline,
    })),
    professors: professors.map((professor) => ({
      id: professor.id,
      name: professor.name,
      nameZh: professor.nameZh,
      university: professor.university.name,
      department: professor.department,
      verified: professor.dataStatus === "verified",
      email: professor.email,
      areas: professor.researchAreas.map((area) => area.researchArea.name),
      interests: professor.researchInterests,
    })),
  });
}
