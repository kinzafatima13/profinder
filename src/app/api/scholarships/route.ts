import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const universityId = req.nextUrl.searchParams.get("universityId") || undefined;
  const type = req.nextUrl.searchParams.get("type") || undefined;
  const scholarships = await prisma.scholarship.findMany({
    where: {
      ...(universityId ? { universityId } : {}),
      ...(type ? { type } : {}),
    },
    include: { university: true },
    orderBy: { name: "asc" },
  });
  const universities = await prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return NextResponse.json({ scholarships, universities });
}
