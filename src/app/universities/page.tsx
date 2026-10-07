import type { Metadata } from "next";
import { ensureSchema, prisma } from "@/lib/prisma";
import UniversityCard from "@/components/UniversityCard";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Chinese Universities | ProFinder" },
  description: "Chinese universities with stored programs and professor records. Open a university to see what is actually on file.",
  alternates: { canonical: `${SITE}/universities` },
};

export default async function UniversitiesPage() {
  await ensureSchema();
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nameZh: true,
      city: true,
      province: true,
      description: true,
      agencyNumber: true,
      _count: { select: { professors: true, programs: true } },
    },
  });

  return (
    <div className="page-container py-10">
      <div className="mb-8">
        <h1 className="section-title">Universities</h1>
        <p className="mt-1 text-gray-600">China · multidisciplinary graduate-study discovery</p>
      </div>
      {universities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">No universities yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <UniversityCard key={u.id} id={u.id} name={u.name} nameZh={u.nameZh} city={u.city} province={u.province} description={u.description} agencyNumber={u.agencyNumber} professorCount={u._count.professors} programCount={u._count.programs} />
          ))}
        </div>
      )}
    </div>
  );
}
