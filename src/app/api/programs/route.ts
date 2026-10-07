import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const degree = req.nextUrl.searchParams.get("degree")?.trim() || "";
  if (q.length > 120) return NextResponse.json({ error: "Query is too long." }, { status: 400 });

  const programs = await prisma.program.findMany({
    where: {
      ...(degree ? { degree } : {}),
      ...(q
        ? {
            OR: [
              { major: { contains: q } },
              { degree: { contains: q } },
              { teachingLang: { contains: q } },
              { officialName: { contains: q } },
              { university: { name: { contains: q } } },
              { university: { country: { contains: q } } },
              { university: { city: { contains: q } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      degree: true,
      major: true,
      teachingLang: true,
      deadline: true,
      verificationStatus: true,
      programUrl: true,
      university: { select: { id: true, name: true, country: true, city: true } },
    },
    orderBy: [{ university: { name: "asc" } }, { major: "asc" }],
    take: 40,
  });

  return NextResponse.json({
    programs: programs.map((program) => ({
      id: program.id,
      degree: program.degree,
      major: program.major,
      teachingLang: program.teachingLang,
      deadline: program.deadline,
      verificationStatus: program.verificationStatus,
      programUrl: program.programUrl,
      universityId: program.university.id,
      university: program.university.name,
      country: program.university.country,
      city: program.university.city,
      funding: "UNKNOWN",
    })),
  });
}
