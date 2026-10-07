import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const universityId = req.nextUrl.searchParams.get("universityId") || undefined;
  const type = req.nextUrl.searchParams.get("type") || undefined;
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const scholarships = await prisma.scholarship.findMany({
    where: {
      ...(universityId ? { universityId } : {}),
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { type: { contains: q } },
              { requirements: { contains: q } },
              { advantages: { contains: q } },
              { university: { name: { contains: q } } },
              { university: { country: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { university: true },
    orderBy: { name: "asc" },
    take: q ? 40 : undefined,
  });
  const universities = await prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return NextResponse.json({
    scholarships: scholarships.map((row) => ({
      ...row,
      fundingCoverage: row.type && /full/i.test(row.type) ? "CHECK_SOURCE" : "UNKNOWN",
    })),
    universities,
  });
}
