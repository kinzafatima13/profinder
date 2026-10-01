import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  try {
    const universities = await prisma.university.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { nameZh: { contains: q } },
              { city: { contains: q } },
              { province: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { professors: true, programs: true } },
      },
    });

    return NextResponse.json({ universities });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 });
  }
}
