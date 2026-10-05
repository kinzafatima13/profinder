import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProfessorCard from "@/components/ProfessorCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = { area?: string; q?: string; page?: string; university?: string; verified?: string; email?: string };

function pageHref(page: number, q?: string, area?: string, university?: string, verified?: string, email?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (area) params.set("area", area);
  if (university) params.set("university", university);
  if (verified === "1") params.set("verified", "1");
  if (email === "1") params.set("email", "1");
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
  const universityId = searchParams.university;
  const verifiedOnly = searchParams.verified === "1";
  const emailOnly = searchParams.email === "1";
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
      universityId ? { universityId } : {},
      verifiedOnly ? { dataStatus: "verified" } : {},
      emailOnly ? { AND: [{ email: { not: null } }, { NOT: { email: "" } }] } : {},
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
    orderBy: [{ dataStatus: "desc" }, { name: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const areas = await prisma.researchArea.findMany({ orderBy: { name: "asc" } });
  const universities = await prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
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
            {" · verified faculty first"}
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
          <select name="university" defaultValue={universityId ?? ""} className="input w-full sm:max-w-[220px]">
            <option value="">All universities</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>{university.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="verified" value="1" defaultChecked={verifiedOnly} />
            Verified only
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="email" value="1" defaultChecked={emailOnly} />
            Has email
          </label>
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
              verified={p.dataStatus === "verified"}
              email={p.email}
            />
          ))}
        </div>
      )}

      {total > 0 && (
        <nav className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Professor pages">
          {page <= 1 ? (
            <span className="btn-secondary pointer-events-none opacity-40">Previous</span>
          ) : (
            <Link className="btn-secondary text-center" href={pageHref(page - 1, q, areaFilter, universityId, verifiedOnly ? "1" : "", emailOnly ? "1" : "")}>Previous</Link>
          )}
          <p className="text-center text-sm text-gray-600">Page {page} of {pageCount}</p>
          {page >= pageCount ? (
            <span className="btn-secondary pointer-events-none opacity-40">Next</span>
          ) : (
            <Link className="btn-secondary text-center" href={pageHref(page + 1, q, areaFilter, universityId, verifiedOnly ? "1" : "", emailOnly ? "1" : "")}>Next</Link>
          )}
        </nav>
      )}
    </div>
  );
}
