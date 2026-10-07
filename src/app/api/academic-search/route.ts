import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (raw.length < 2) return NextResponse.json({ results: [] });
  const q = normalize(raw);

  const aliases = await prisma.academicAlias.findMany({
    where: { OR: [{ normalizedTerm: { contains: q } }, { term: { contains: raw } }] },
    include: {
      major: { include: { discipline: { include: { academicField: true } } } },
      discipline: { include: { academicField: true } },
      academicField: true,
    },
    take: 8,
  });

  const [majors, disciplines, fields, programs] = await Promise.all([
    prisma.major.findMany({
      where: { OR: [{ name: { contains: raw } }, { officialName: { contains: raw } }, { slug: { contains: q.replace(/ /g, "-") } }] },
      select: { name: true, officialName: true, slug: true, discipline: { select: { name: true, academicField: { select: { name: true } } } } },
      take: 8,
      orderBy: { name: "asc" },
    }),
    prisma.discipline.findMany({
      where: { name: { contains: raw } },
      select: { name: true, slug: true, academicField: { select: { name: true, slug: true } } },
      take: 5,
    }),
    prisma.academicField.findMany({
      where: { name: { contains: raw } },
      select: { name: true, slug: true },
      take: 5,
    }),
    prisma.program.findMany({
      where: { OR: [{ major: { contains: raw } }, { officialName: { contains: raw } }] },
      select: { id: true, major: true, degree: true, university: { select: { name: true, id: true } } },
      take: 5,
    }),
  ]);

  const results = [
    ...aliases.flatMap((alias) => {
      if (alias.major) return [{ type: "alias", label: alias.major.officialName || alias.major.name, subtitle: `Matches “${alias.term}” · ${alias.major.discipline.academicField.name}`, href: "/majors/" + alias.major.slug }];
      if (alias.discipline) return [{ type: "alias", label: alias.discipline.name, subtitle: `Matches “${alias.term}”`, href: "/fields/" + alias.discipline.academicField.slug }];
      if (alias.academicField) return [{ type: "alias", label: alias.academicField.name, subtitle: `Matches “${alias.term}”`, href: "/fields/" + alias.academicField.slug }];
      return [];
    }),
    ...majors.map((x) => ({ type: "major", label: x.officialName || x.name, subtitle: x.discipline.academicField.name + " · " + x.discipline.name, href: "/majors/" + x.slug })),
    ...disciplines.map((x) => ({ type: "discipline", label: x.name, subtitle: x.academicField.name, href: "/fields/" + x.academicField.slug })),
    ...fields.map((x) => ({ type: "field", label: x.name, subtitle: "Academic field", href: "/fields/" + x.slug })),
    ...programs.map((x) => ({ type: "program", label: `${x.degree} · ${x.major}`, subtitle: x.university.name, href: "/universities/" + x.university.id })),
  ];

  const seen = new Set<string>();
  return NextResponse.json({
    results: results.filter((row) => {
      const key = row.href + row.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12),
  });
}
