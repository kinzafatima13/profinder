import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProfessorCard from "@/components/ProfessorCard";
import SaveOpportunityButton from "@/components/SaveOpportunityButton";
import { SITE, clip } from "@/lib/seo";
import { loadUniversityHub, resolveUniversityParam } from "@/lib/university-hub";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolved = await resolveUniversityParam(params.id);
    if (!resolved) return { title: "University", robots: { index: false, follow: false } };
    const hub = await loadUniversityHub(resolved.id);
    if (!hub) return { title: "University", robots: { index: false, follow: false } };
    const { university, counts } = hub;
    return {
      title: { absolute: `${university.name} Professors & Research Opportunities | ProFinder` },
      description: clip(`${university.name}${university.city ? `, ${university.city}` : ""}, China. ${counts.programs} programs and ${counts.professors} professor records are stored.`),
      alternates: { canonical: `${SITE}/universities/${university.id}` },
    };
  } catch (error) {
    console.error("[university] metadata failed", error);
    return { title: "University", robots: { index: false, follow: false } };
  }
}

export default async function UniversityDetailPage({ params }: Props) {
  const resolved = await resolveUniversityParam(params.id);
  if (!resolved) notFound();
  if (resolved.canonicalRedirect) redirect(`/universities/${resolved.id}`);

  const hub = await loadUniversityHub(resolved.id);
  if (!hub) notFound();
  const { university: uni, counts, programs, professors, scholarships, researchAreas, sectionErrors } = hub;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: uni.name,
    url: uni.officialUrl || `${SITE}/universities/${uni.id}`,
    address: { "@type": "PostalAddress", addressCountry: uni.country || "CN", ...(uni.city ? { addressLocality: uni.city } : {}) },
  };
  const professorHref = `/professors?university=${encodeURIComponent(uni.id)}`;
  const programHref = `/programs?university=${encodeURIComponent(uni.id)}`;

  return (
    <div className="page-container py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--gray-500)]">
        <Link href="/universities" className="hover:text-[var(--navy)]">Universities</Link>
        <span> / </span>
        <span className="text-[var(--navy)]">{uni.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="section-title">{uni.name}</h1>
        {uni.nameZh && <p className="text-lg text-gray-400">{uni.nameZh}</p>}
        <p className="mt-1 text-gray-600">{[uni.city, uni.province, uni.country].filter(Boolean).join(" · ") || "Location not on file"}</p>
        <p className="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="#programs" className="text-[var(--teal)]">Programs</a>
          <a href="#professors" className="text-[var(--teal)]">Professors</a>
          <a href="#funding" className="text-[var(--teal)]">Funding</a>
          <a href="#research" className="text-[var(--teal)]">Research</a>
        </p>
        {uni.agencyNumber && <span className="mt-2 inline-block badge-navy">CSC Agency Number: {uni.agencyNumber}</span>}
      </header>

      <section className="mt-6 max-w-3xl" aria-label="Overview">
        {uni.description ? <p className="text-gray-700">{uni.description}</p> : <p className="text-sm text-gray-500">No overview is stored for this university yet.</p>}
        <dl className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wide text-gray-400">Verification</dt><dd>{uni.dataStatus === "verified" ? "Verified record" : "Unverified · stored record only"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-gray-400">Source</dt><dd>{uni.dataSource || "Source label not stored"}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {uni.officialUrl ? (
            <a href={uni.officialUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Official website →</a>
          ) : (
            <span className="text-gray-500">Official website is not on file.</span>
          )}
          {uni.sourceUrl && <a href={uni.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Source link →</a>}
          {uni.applicationUrl && <a href={uni.applicationUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Application page →</a>}
          {uni.scholarshipUrl && <a href={uni.scholarshipUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Scholarship page →</a>}
        </div>
      </section>

      {sectionErrors.length > 0 && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          Some sections could not be loaded ({sectionErrors.join(", ")}). The university record itself is shown. Try again from the error page if the whole view fails.
        </p>
      )}

      <section id="programs" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--navy)]">Programs ({counts.programs})</h2>
          <Link href={programHref} className="text-sm font-medium text-[var(--teal-dark)] hover:underline">View all programs →</Link>
        </div>
        {programs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No programs listed yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Degree</th>
                  <th className="pb-2 pr-4 font-medium">Major</th>
                  <th className="pb-2 pr-4 font-medium">Language</th>
                  <th className="pb-2 font-medium">Deadline</th>
                  <th className="pb-2 font-medium"><span className="sr-only">Save</span></th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-[var(--navy)]">{program.degree}</td>
                    <td className="py-3 pr-4">
                      {program.major}
                      {program.programUrl && <a href={program.programUrl} className="mt-1 block text-xs text-[var(--teal)]" target="_blank" rel="noopener noreferrer">Program link</a>}
                    </td>
                    <td className="py-3 pr-4">{program.teachingLang ?? "—"}</td>
                    <td className="py-3 text-amber-800">Unverified · {program.deadline ?? "No date stored"}{program.tuition ? ` · ${program.tuition}` : ""}</td>
                    <td className="py-3"><SaveOpportunityButton programId={program.id} label="Save program" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {counts.programs > programs.length && (
              <p className="mt-3 text-sm text-gray-500">Showing {programs.length} of {counts.programs}. <Link href={programHref} className="font-medium text-[var(--teal-dark)]">View all programs</Link></p>
            )}
          </div>
        )}
      </section>

      <section id="professors" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--navy)]">Professors ({counts.professors})</h2>
          <Link href={professorHref} className="text-sm font-medium text-[var(--teal-dark)] hover:underline">View all professors →</Link>
        </div>
        {professors.length === 0 ? (
          <p className="mt-3 max-w-2xl rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Verified faculty data is not available for this university yet. The university remains listed so programs and official links can still be reviewed. No faculty records are created until an official directory or academic source is imported.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {professors.map((professor) => (
                <ProfessorCard
                  key={professor.id}
                  id={professor.id}
                  name={professor.name}
                  nameZh={professor.nameZh}
                  position={professor.position}
                  department={professor.department}
                  universityName={uni.name}
                  universityCity={uni.city}
                  researchAreas={professor.researchAreas}
                  researchInterests={professor.researchInterests}
                  verified={professor.dataStatus === "verified"}
                  email={professor.email}
                  recent={null}
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Showing {professors.length} of {counts.professors}. This page does not load the full faculty set.
              {" "}<Link href={professorHref} className="font-medium text-[var(--teal-dark)]">View all professors</Link>
            </p>
          </>
        )}
      </section>

      <section id="funding" className="mt-12">
        <h2 className="text-xl font-bold text-[var(--navy)]">Funding ({counts.scholarships})</h2>
        <p className="mt-2 text-sm text-[var(--gray-500)]">Amounts and deadlines below are unverified unless an official source is linked.</p>
        {scholarships.length === 0 && <p className="mt-3 text-sm text-[var(--gray-500)]">No scholarship records are stored for this university.</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {scholarships.map((scholarship) => (
            <div key={scholarship.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[var(--navy)]">{scholarship.name}</h3>
                {scholarship.type && <span className="badge-teal">{scholarship.type}</span>}
              </div>
              {scholarship.deadline && <p className="mt-1 text-xs text-amber-800">Unverified · {scholarship.deadline}</p>}
              {scholarship.officialUrl && <a href={scholarship.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-[var(--teal)]">Official source</a>}
              <SaveOpportunityButton scholarshipId={scholarship.id} label="Save scholarship" />
              {scholarship.requirements && <p className="mt-2 text-sm text-gray-600">{scholarship.requirements}</p>}
            </div>
          ))}
        </div>
      </section>

      <section id="research" className="mt-12">
        <h2 className="text-xl font-bold text-[var(--navy)]">Research</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">Tags open the professor discovery list for this university. They are not a separate research-area maze.</p>
        {researchAreas.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No research-area tags are stored for professors at this university.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {researchAreas.map((name) => (
              <li key={name}>
                <Link href={`${professorHref}&research=${encodeURIComponent(name)}`} className="tag">
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm"><Link href={professorHref} className="font-medium text-[var(--teal-dark)]">Browse professors at {uni.name} →</Link></p>
      </section>
    </div>
  );
}
