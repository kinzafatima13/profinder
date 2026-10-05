import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { computeResearchMatch } from "@/lib/matching";
import { assessTarget, newestStoredYear } from "@/lib/professor-assessment";
import ProfessorCard from "@/components/ProfessorCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = {
  area?: string;
  q?: string;
  page?: string;
  university?: string;
  verified?: string;
  email?: string;
  department?: string;
  papers?: string;
  funding?: string;
};

function pageHref(page: number, filters: Omit<SearchParams, "page">) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.area) params.set("area", filters.area);
  if (filters.university) params.set("university", filters.university);
  if (filters.department) params.set("department", filters.department);
  if (filters.verified === "1") params.set("verified", "1");
  if (filters.email === "1") params.set("email", "1");
  if (filters.papers === "1") params.set("papers", "1");
  if (filters.funding) params.set("funding", filters.funding);
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
  const department = searchParams.department?.trim();
  const papersOnly = searchParams.papers === "1";
  const funding = searchParams.funding === "known" ? "known" : searchParams.funding === "unknown" ? "unknown" : "";
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
      department ? { department: { contains: department } } : {},
      verifiedOnly ? { dataStatus: "verified" } : {},
      emailOnly ? { AND: [{ email: { not: null } }, { NOT: { email: "" } }] } : {},
      papersOnly
        ? {
            OR: [
              { AND: [{ publications: { not: null } }, { NOT: { publications: "" } }] },
              { dataStatus: "verified", publicationRows: { some: {} } },
            ],
          }
        : {},
      funding === "known" ? { AND: [{ lab: { not: null } }, { NOT: { lab: "" } }] } : {},
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
  const session = await getServerSession(authOptions);
  const student = session?.user?.email
    ? await prisma.student.findUnique({ where: { email: session.user.email } })
    : null;
  const filters = {
    q,
    area: areaFilter,
    university: universityId,
    department,
    verified: verifiedOnly ? "1" : "",
    email: emailOnly ? "1" : "",
    papers: papersOnly ? "1" : "",
    funding,
  };
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
          <input className="input w-full sm:max-w-[180px]" name="department" defaultValue={department ?? ""} placeholder="Department" />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="verified" value="1" defaultChecked={verifiedOnly} />
            Verified only
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="email" value="1" defaultChecked={emailOnly} />
            Has email
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="papers" value="1" defaultChecked={papersOnly} />
            Has stored papers
          </label>
          <select name="funding" defaultValue={funding} className="input w-full sm:max-w-[180px]">
            <option value="">Funding: any</option>
            <option value="known">Funding on file</option>
            <option value="unknown">Funding unknown</option>
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
          {professors.map((p) => {
            const match = student?.researchInterests
              ? computeResearchMatch(
                  {
                    researchInterests: student.researchInterests,
                    major: student.major,
                    degree: student.degree,
                    skills: student.skills,
                    academicBackground: student.academicBackground,
                    projects: student.projects,
                    cvText: student.cvText,
                  },
                  {
                    researchInterests: p.researchInterests,
                    department: p.department,
                    publications: p.publications,
                    researchAreas: p.researchAreas.map((area) => ({
                      name: area.researchArea.name,
                      keywords: area.researchArea.keywords,
                    })),
                  }
                )
              : null;
            const target = assessTarget({
              matchScore: match && !match.incomplete ? match.score : null,
              verified: p.dataStatus === "verified",
              hasEmail: Boolean(p.email?.trim()),
              newestYear: newestStoredYear(p.publications),
            });
            return (
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
              matchScore={match && !match.incomplete ? match.score : null}
              priority={target.level}
            />
            );
          })}
        </div>
      )}

      {total > 0 && (
        <nav className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Professor pages">
          {page <= 1 ? (
            <span className="btn-secondary pointer-events-none opacity-40">Previous</span>
          ) : (
            <Link className="btn-secondary text-center" href={pageHref(page - 1, filters)}>Previous</Link>
          )}
          <p className="text-center text-sm text-gray-600">Page {page} of {pageCount}</p>
          {page >= pageCount ? (
            <span className="btn-secondary pointer-events-none opacity-40">Next</span>
          ) : (
            <Link className="btn-secondary text-center" href={pageHref(page + 1, filters)}>Next</Link>
          )}
        </nav>
      )}
    </div>
  );
}
