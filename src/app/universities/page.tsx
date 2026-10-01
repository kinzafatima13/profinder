import { prisma } from "@/lib/prisma";
import UniversityCard from "@/components/UniversityCard";

export const dynamic = "force-dynamic";

export default async function UniversitiesPage() {
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { professors: true, programs: true } },
    },
  });

  return (
    <div className="page-container py-10">
      <div className="mb-8">
        <h1 className="section-title">Universities</h1>
        <p className="mt-1 text-gray-600">
          China · Computer Science &amp; related technology fields
        </p>
      </div>

      {universities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">No universities yet. Run the seed script.</p>
          <code className="mt-2 block text-sm text-gray-400">
            npx prisma db seed
          </code>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <UniversityCard
              key={u.id}
              id={u.id}
              name={u.name}
              nameZh={u.nameZh}
              city={u.city}
              province={u.province}
              description={u.description}
              agencyNumber={u.agencyNumber}
              professorCount={u._count.professors}
              programCount={u._count.programs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
