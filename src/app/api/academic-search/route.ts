import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, prisma } from "@/lib/prisma";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function ensureAliasTable() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AcademicAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "academicFieldId" TEXT,
    "disciplineId" TEXT,
    "majorId" TEXT
  )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AcademicAlias_normalizedTerm_kind_key" ON "AcademicAlias"("normalizedTerm", "kind")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AcademicAlias_normalizedTerm_idx" ON "AcademicAlias"("normalizedTerm")`);
}

export async function GET(request: NextRequest) {
  await ensureSchema();
  await ensureAliasTable();
  const raw = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (raw.length < 2 || raw.length > 120) return NextResponse.json({ results: [] });
  const q = normalize(raw);

  const [majors, disciplines, fields, programs, professors, areas, scholarships, aliases] = await Promise.all([
    prisma.major.findMany({
      where: { OR: [{ name: { contains: raw } }, { officialName: { contains: raw } }] },
      select: { name: true, officialName: true, slug: true, discipline: { select: { name: true, academicField: { select: { name: true } } } } },
      take: 6,
      orderBy: { name: "asc" },
    }),
    prisma.discipline.findMany({
      where: { name: { contains: raw } },
      select: { name: true, academicField: { select: { name: true } } },
      take: 5,
    }),
    prisma.academicField.findMany({
      where: { name: { contains: raw } },
      select: { name: true },
      take: 4,
    }),
    prisma.program.findMany({
      where: { OR: [{ major: { contains: raw } }, { degree: { contains: raw } }, { officialName: { contains: raw } }, { university: { name: { contains: raw } } }, { university: { country: { contains: raw } } }] },
      select: { id: true, major: true, degree: true, university: { select: { name: true, id: true, country: true } } },
      take: 6,
    }),
    prisma.professor.findMany({
      where: { OR: [{ name: { contains: raw } }, { researchInterests: { contains: raw } }, { department: { contains: raw } }, { university: { name: { contains: raw } } }] },
      select: { id: true, name: true, department: true, university: { select: { name: true } } },
      take: 5,
    }),
    prisma.researchArea.findMany({
      where: { name: { contains: raw } },
      select: { name: true },
      take: 5,
    }),
    prisma.scholarship.findMany({
      where: { OR: [{ name: { contains: raw } }, { type: { contains: raw } }] },
      select: { id: true, name: true, type: true, university: { select: { name: true } } },
      take: 4,
    }),
    prisma.academicAlias.findMany({
      where: { OR: [{ term: { contains: raw } }, { normalizedTerm: { contains: q } }] },
      select: { term: true, kind: true, academicField: { select: { name: true } }, discipline: { select: { name: true } }, major: { select: { name: true } } },
      take: 5,
    }),
  ]);

  const results = [
    ...programs.map((x) => ({ type: "program", label: `${x.degree} · ${x.major}`, subtitle: `Program · ${x.university.name}${x.university.country ? ` · ${x.university.country}` : ""}`, href: "/universities/" + x.university.id })),
    ...scholarships.map((x) => ({ type: "scholarship", label: x.name, subtitle: `Scholarship · ${x.university?.name || "No university linked"} · coverage unknown unless the source says otherwise`, href: "/scholarship" })),
    ...professors.map((x) => ({ type: "supervisor", label: x.name, subtitle: `Supervisor · ${x.university.name}${x.department ? ` · ${x.department}` : ""}`, href: "/professors/" + x.id })),
    ...areas.map((x) => ({ type: "research", label: x.name, subtitle: "Research area · view stored supervisors", href: "/professors?area=" + encodeURIComponent(x.name) })),
    ...aliases.map((x) => {
      const target = x.major?.name || x.discipline?.name || x.academicField?.name || x.term;
      return { type: "alias", label: x.term, subtitle: `Stored alias · ${x.kind} · ${target}`, href: "/programs?q=" + encodeURIComponent(target) };
    }),
    ...majors.map((x) => ({ type: "major", label: x.officialName || x.name, subtitle: `Stored major · ${x.discipline.academicField.name} · ${x.discipline.name}`, href: "/programs?q=" + encodeURIComponent(x.name) })),
    ...disciplines.map((x) => ({ type: "discipline", label: x.name, subtitle: `Discipline · ${x.academicField.name}`, href: "/programs?q=" + encodeURIComponent(x.name) })),
    ...fields.map((x) => ({ type: "field", label: x.name, subtitle: "Academic field", href: "/programs?q=" + encodeURIComponent(x.name) })),
  ];

  const seen = new Set<string>();
  return NextResponse.json({
    results: results.filter((row) => {
      const key = row.type + row.href + row.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12),
    query: q,
  });
}
