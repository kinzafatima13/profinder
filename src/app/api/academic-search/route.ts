import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [majors, disciplines, fields] = await Promise.all([
    prisma.major.findMany({
      where: { OR: [{ name: { contains: q } }, { officialName: { contains: q } }] },
      select: { id: true, name: true, officialName: true, slug: true, discipline: { select: { name: true, academicField: { select: { name: true } } } } },
      take: 8,
      orderBy: { name: "asc" },
    }),
    prisma.discipline.findMany({
      where: { name: { contains: q } },
      select: { id: true, name: true, slug: true, academicField: { select: { name: true } } },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.academicField.findMany({
      where: { OR: [{ name: { contains: q } }, { aliases: { some: { term: { contains: q } } } }] },
      select: { id: true, name: true, slug: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...majors.map((x) => ({ type: "major", label: x.officialName || x.name, subtitle: x.discipline.academicField.name + " · " + x.discipline.name, href: "/majors/" + x.slug })),
      ...disciplines.map((x) => ({ type: "discipline", label: x.name, subtitle: x.academicField.name, href: "/majors?discipline=" + encodeURIComponent(x.name) })),
      ...fields.map((x) => ({ type: "field", label: x.name, subtitle: "Academic field", href: "/fields/" + x.slug })),
    ],
  });
}
