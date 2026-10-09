import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Programs | ProFinder" },
  description: "Browse stored graduate programs by university, degree, and major. Only fields present in the database are shown.",
  alternates: { canonical: `${SITE}/programs` },
};

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { degree?: string; q?: string; university?: string };
}) {
  const degree = searchParams.degree?.trim() || "";
  const q = searchParams.q?.trim() || "";
  const universityId = searchParams.university?.trim() || "";

  const programs = await prisma.program.findMany({
    where: {
      ...(universityId ? { universityId } : {}),
      ...(degree ? { degree } : {}),
      ...(q
        ? {
            OR: [
              { major: { contains: q } },
              { university: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { university: { select: { id: true, name: true, city: true, country: true, dataStatus: true } } },
    orderBy: [{ university: { name: "asc" } }, { major: "asc" }],
    take: 200,
  });

  const degrees = await prisma.program.findMany({
    distinct: ["degree"],
    select: { degree: true },
    orderBy: { degree: "asc" },
  });

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Programs"
        description="Country, university, degree, then program. Deadlines and fees appear only when they are stored. Unverified notes are not official admissions advice."
      />
      <form className="mt-6 flex flex-wrap gap-2" action="/programs">
        {universityId && <input type="hidden" name="university" value={universityId} />}
        <input name="q" defaultValue={q} placeholder="University or major" className="input max-w-xs" />
        <select name="degree" defaultValue={degree} className="input max-w-[10rem]">
          <option value="">All degrees</option>
          {degrees.map((item) => (
            <option key={item.degree} value={item.degree}>{item.degree}</option>
          ))}
        </select>
        <button className="btn-primary" type="submit">Filter</button>
      </form>
      {universityId && (
        <p className="mt-3 text-sm text-[var(--gray-600)]">
          Filtered to one university.{" "}
          <Link href="/programs" className="font-medium text-[var(--teal-dark)] hover:underline">Clear university filter</Link>
        </p>
      )}
      <p className="mt-4 text-xs text-[var(--gray-500)]">
        {programs.length} stored programs shown{programs.length === 200 ? " (first 200)" : ""}.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--gray-200)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--gray-200)] text-xs uppercase tracking-wide text-[var(--gray-500)]">
            <tr>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">University</th>
              <th className="px-4 py-3">Language</th>
              <th className="px-4 py-3">English</th>
              <th className="px-4 py-3">Deadline</th>
            </tr>
          </thead>
          <tbody className="reveal-list">
            {programs.map((program) => (
              <tr key={program.id} className="border-b border-[var(--gray-100)]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--navy)]">{program.degree} · {program.major}</p>
                  {program.programUrl ? (
                    <a className="text-xs text-[var(--teal-dark)] underline" href={program.programUrl}>Official program link</a>
                  ) : (
                    <p className="text-xs text-[var(--gray-500)]">Program URL not verified</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-[var(--navy)] hover:underline" href={`/universities/${program.university.id}`}>
                    {program.university.name}
                  </Link>
                  <p className="text-xs text-[var(--gray-500)]">
                    {[program.university.city, program.university.country].filter(Boolean).join(", ")} ·{" "}
                    {program.university.dataStatus === "verified" ? "University verified" : "University needs verification"}
                  </p>
                </td>
                <td className="px-4 py-3">{program.teachingLang || "Not available"}</td>
                <td className="px-4 py-3">{program.englishReq || program.ielts || program.toefl || "Not available"}</td>
                <td className="px-4 py-3">{program.deadline || "Not verified"}</td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-[var(--gray-500)]" colSpan={5}>
                  No stored programs match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
