import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
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
  searchParams: { degree?: string; q?: string };
}) {
  const degree = searchParams.degree?.trim() || "";
  const q = searchParams.q?.trim() || "";

  const programs = await prisma.program.findMany({
    where: {
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
    <div className="page-container py-10">
      <h1 className="section-title">Programs</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">
        Country, university, degree, then program. Deadlines and fees appear only when they are stored. Unverified notes are not official admissions advice.
      </p>
      <form className="mt-6 flex flex-wrap gap-2" action="/programs">
        <input name="q" defaultValue={q} placeholder="University or major" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="degree" defaultValue={degree} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All degrees</option>
          {degrees.map((item) => (
            <option key={item.degree} value={item.degree}>{item.degree}</option>
          ))}
        </select>
        <button className="btn-primary" type="submit">Filter</button>
      </form>
      <p className="mt-4 text-xs text-gray-500">{programs.length} stored programs shown{programs.length === 200 ? " (first 200)" : ""}.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">University</th>
              <th className="px-4 py-3">Language</th>
              <th className="px-4 py-3">English</th>
              <th className="px-4 py-3">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr key={program.id} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--navy)]">{program.degree} · {program.major}</p>
                  {program.programUrl ? <a className="text-xs underline" href={program.programUrl}>Official program link</a> : <p className="text-xs text-gray-400">Program URL not verified</p>}
                </td>
                <td className="px-4 py-3">
                  <Link className="underline" href={`/universities/${program.university.id}`}>{program.university.name}</Link>
                  <p className="text-xs text-gray-500">{[program.university.city, program.university.country].filter(Boolean).join(", ")} · {program.university.dataStatus === "verified" ? "University verified" : "University needs verification"}</p>
                </td>
                <td className="px-4 py-3">{program.teachingLang || "Not available"}</td>
                <td className="px-4 py-3">{program.englishReq || program.ielts || program.toefl || "Not available"}</td>
                <td className="px-4 py-3">{program.deadline || "Not verified"}</td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr><td className="px-4 py-8 text-gray-500" colSpan={5}>No stored programs match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
