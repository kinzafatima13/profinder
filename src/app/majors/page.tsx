import type { Metadata } from "next";
import Link from "next/link";
import { ensureSchema, prisma } from "@/lib/prisma";
import AcademicSearchBox from "@/components/AcademicSearchBox";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Majors & Graduate Programs | ProFinder" },
  description: "Search and browse academic majors and graduate programs from university-sourced records.",
  alternates: { canonical: SITE + "/majors" },
};

export default async function MajorsPage({ searchParams }: { searchParams: { q?: string; discipline?: string } }) {
  await ensureSchema();
  const q = searchParams.q?.trim();
  const discipline = searchParams.discipline?.trim();
  const majors = await prisma.major.findMany({
    where: {
      AND: [
        q ? { OR: [{ name: { contains: q } }, { officialName: { contains: q } }] } : {},
        discipline ? { discipline: { name: discipline } } : {},
      ],
    },
    include: { discipline: { include: { academicField: true } }, _count: { select: { programs: true, professors: true } } },
    orderBy: { name: "asc" },
    take: 60,
  });
  return <div className="page-container py-10">
    <h1 className="section-title">Majors</h1>
    <p className="mt-2 max-w-2xl text-gray-600">Search by what you want to study. Results come from normalized major records; the official title is preserved on each record.</p>
    <div className="mt-6"><AcademicSearchBox /></div>
    <div className="mt-8 space-y-3">
      {majors.map((m) => <Link key={m.id} href={"/majors/" + m.slug} className="block card p-4">
        <h2 className="font-semibold text-[var(--navy)]">{m.officialName || m.name}</h2>
        <p className="mt-1 text-xs text-gray-500">{m.discipline.academicField.name} · {m.discipline.name} · {m._count.programs} programs · {m._count.professors} linked professors</p>
      </Link>)}
      {majors.length === 0 && <div className="card p-8 text-center text-gray-500">No major is stored for that search yet.</div>}
    </div>
  </div>;
}
