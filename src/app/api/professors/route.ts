import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const area = req.nextUrl.searchParams.get("area")?.trim();

  try {
    const professors = await prisma.professor.findMany({
      where: {
        AND: [
          area
            ? {
                researchAreas: {
                  some: { researchArea: { name: area } },
                },
              }
            : {},
          q
            ? {
                OR: [
                  { name: { contains: q } },
                  { nameZh: { contains: q } },
                  { researchInterests: { contains: q } },
                  { department: { contains: q } },
                  { university: { name: { contains: q } } },
                  { researchAreas: { some: { researchArea: { name: { contains: q } } } } },
                ],
              }
            : {},
        ],
      },
      include: {
        university: true,
        researchAreas: { include: { researchArea: true } },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json({
      professors: professors.map((p) => ({
        id: p.id,
        name: p.name,
        nameZh: p.nameZh,
        position: p.position,
        department: p.department,
        universityName: p.university.name,
        universityCity: p.university.city,
        researchAreas: p.researchAreas.map((r) => r.researchArea.name),
        researchInterests: p.researchInterests,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch professors" }, { status: 500 });
  }
}
