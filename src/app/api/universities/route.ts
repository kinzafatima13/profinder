import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  try {
    await ensureSchema();
    const universities = await prisma.university.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { nameZh: { contains: q } },
              { city: { contains: q } },
              { province: { contains: q } },
              { country: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      take: q ? 40 : 120,
      select: {
        id: true,
        name: true,
        nameZh: true,
        city: true,
        province: true,
        country: true,
        description: true,
        agencyNumber: true,
        _count: { select: { professors: true, programs: true } },
      },
    });

    return NextResponse.json({ universities, capped: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 });
  }
}
