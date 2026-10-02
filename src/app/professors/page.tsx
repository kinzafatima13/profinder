import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProfessorCard from "@/components/ProfessorCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = { area?: string; q?: string; page?: string };

function pageHref(page: number, q?: string, area?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (area) params.set("area", area);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/professors?${query}` : "/professors";
}

export default async function ProfessorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const areaFilter = searchParams.area;
  const q = searchParams.q?.trim();
  const requested = Number(searchParams.page || "1");
  const where = {
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
  };

  const total = await prisma.professor.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isFinite(requested) ? Math.min(Math.max(1, Math.floor(requested)), pageCount) : 1;

  const professors = await prisma.professor.findMany({
    where,
    include: {
      university: true,
      researchAreas: { include: { researchArea: true } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const areas = await prisma.researchArea.findMany({ orderBy: { name: "asc" } });
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = total === 0 ? 0 : start + professors.length - 1;

  return (
    <div className="page-container py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">Professors</h1>
          <p className="mt-1 text-gray-600">
            {total} professor{total !== 1 ? "s" : ""} found
            {total > 0 ? ` · showing ${start}–${end}` : ""}
          </p>
        </div>

        <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap" action="/professors" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name or research..."
            className="input w-full sm:max-w-xs"
          />
          <select
            name="area"
            defaultValue={areaFilter ?? ""}
            className="input w-full sm:max-w-[200px]"
          >
            <option value="">All research areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary w-full sm:w-auto">
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

      {total > 0 && (
        <nav className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Professor pages">
          {page <= 1 ? (
            <span className="btn-secondary pointer-events-none opacity-40">Previous</span>
          ) : (
            <Link className="btn-secondary text-center" href={pageHref(page - 1, q, areaFilter)}>Previous</Link>
          )}
          <p className="text-center text-sm text-gray-600">Page {page} of {pageCount}</p>
          {page >= pageCount ? (
            <span className="btn-secondary pointer-events-none opacity-40">Next</span>
          ) : (
            <Link className="btn-secondary text-center" href={pageHref(page + 1, q, areaFilter)}>Next</Link>
          )}
        </nav>
      )}
    </div>
  );
}
