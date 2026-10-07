import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { computeResearchMatch } from "@/lib/matching";
import { assessTarget, newestStoredYear } from "@/lib/professor-assessment";
import ProfessorCard from "@/components/ProfessorCard";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

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
  field?: string;
  discipline?: string;
  major?: string;
};

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const filtered = Boolean(searchParams.q || searchParams.area || searchParams.university || searchParams.verified || searchParams.email || searchParams.department || searchParams.papers || searchParams.page || searchParams.field || searchParams.discipline || searchParams.major);
  return {
    title: { absolute: "Professors | ProFinder" },
    description: "Supervisor records currently stored. Verification, email, and research tags are shown only when stored. The catalog is not limited to one discipline.",
    alternates: { canonical: `${SITE}/professors` },
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

const PAGE_SIZE = 24;

function pageHref(page: number, filters: Omit<SearchParams, "page">) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.area) params.set("area", filters.area);
  if (filters.university) params.set("university", filters.university);
  if (filters.department) params.set("department", filters.department);
  if (filters.field) params.set("field", filters.field);
  if (filters.discipline) params.set("discipline", filters.discipline);
  if (filters.major) params.set("major", filters.major);
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
  const fieldId = searchParams.field || "";
  const disciplineId = searchParams.discipline || "";
  const majorId = searchParams.major || "";
  const requested = Number(searchParams.page || "1");
  const academicFilter = Boolean(fieldId || disciplineId || majorId);
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
      fieldId ? { academicFields: { some: { academicFieldId: fieldId } } } : {},
      disciplineId ? { disciplines: { some: { disciplineId } } } : {},
      majorId ? { majors: { some: { majorId } } } : {},
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

  const [professors, areas, universities, fields, disciplines, majors] = await Promise.all([
    prisma.professor.findMany({
      where,
      include: {
        university: true,
        researchAreas: { include: { researchArea: true } },
      },
      orderBy: [{ dataStatus: "desc" }, { name: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.researchArea.findMany({ orderBy: { name: "asc" } }),
    prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.academicField.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.discipline.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, academicFieldId: true } }),
    prisma.major.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, officialName: true, disciplineId: true } }),
  ]);

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
    field: fieldId,
    discipline: disciplineId,
    major: majorId,
  };
  const disciplineOptions = disciplines.filter((row) => !fieldId || row.academicFieldId === fieldId);
  const majorOptions = majors.filter((row) => !disciplineId || row.disciplineId === disciplineId);
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
          {fields.length > 0 && (
            <select name="field" defaultValue={fieldId} className="input w-full sm:max-w-[200px]">
              <option value="">All academic fields</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          )}
          {disciplines.length > 0 && (
            <select name="discipline" defaultValue={disciplineId} className="input w-full sm:max-w-[200px]">
              <option value="">All disciplines</option>
              {disciplineOptions.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          )}
          {majors.length > 0 && (
            <select name="major" defaultValue={majorId} className="input w-full sm:max-w-[220px]">
              <option value="">All majors</option>
              {majorOptions.map((row) => (
                <option key={row.id} value={row.id}>{row.officialName || row.name}</option>
              ))}
            </select>
          )}
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
          <p className="text-sm text-[var(--gray-500)]">Field, discipline, and major use stored links only. Funding is not a filter because it is not publicly verified.</p>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Filter
          </button>
        </form>
      </div>

      {professors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          {academicFilter
            ? "No stored link matches this academic filter. Professors are not guessed from department names."
            : "No professors match your filters."}
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
              recent={newestStoredYear(p.publications) ? `Newest stored year ${newestStoredYear(p.publications)}` : null}
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
