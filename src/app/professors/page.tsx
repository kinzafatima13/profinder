import { prisma } from "@/lib/prisma";
import ProfessorCard from "@/components/ProfessorCard";

export const dynamic = "force-dynamic";

type SearchParams = { area?: string; q?: string };

export default async function ProfessorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const areaFilter = searchParams.area;
  const q = searchParams.q?.trim();

  const professors = await prisma.professor.findMany({
    where: {
      AND: [
        areaFilter
          ? {
              researchAreas: {
                some: { researchArea: { name: areaFilter } },
              },
            }
          : {},
        q
          ? {
              OR: [
                { name: { contains: q } },
                { researchInterests: { contains: q } },
                { department: { contains: q } },
              ],
            }
          : {},
      ],
    },
    include: {
      university: true,
      researchAreas: { include: { researchArea: true } },
    },
    orderBy: { name: "asc" },
  });

  const areas = await prisma.researchArea.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="page-container py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">Professors</h1>
          <p className="mt-1 text-gray-600">
            {professors.length} professor{professors.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <form className="flex flex-wrap gap-2" action="/professors" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name or research..."
            className="input max-w-xs"
          />
          <select
            name="area"
            defaultValue={areaFilter ?? ""}
            className="input max-w-[200px]"
          >
            <option value="">All research areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Filter
          </button>
        </form>
      </div>

      {professors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          No professors match your filters.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {professors.map((p) => (
            <ProfessorCard
              key={p.id}
              id={p.id}
              name={p.name}
              nameZh={p.nameZh}
              position={p.position}
              department={p.department}
              universityName={p.university.name}
              universityCity={p.university.city}
              researchAreas={p.researchAreas.map((r) => r.researchArea.name)}
              researchInterests={p.researchInterests}
            />
          ))}
        </div>
      )}
    </div>
  );
}
