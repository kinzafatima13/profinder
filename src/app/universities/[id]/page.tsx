import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfessorCard from "@/components/ProfessorCard";
import SaveOpportunityButton from "@/components/SaveOpportunityButton";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function UniversityDetailPage({ params }: Props) {
  const uni = await prisma.university.findUnique({
    where: { id: params.id },
    include: {
      programs: { orderBy: [{ degree: "asc" }, { major: "asc" }] },
      scholarships: true,
      professors: {
        include: {
          researchAreas: { include: { researchArea: true } },
        },
        orderBy: [{ dataStatus: "desc" }, { name: "asc" }],
      },
    },
  });

  if (!uni) notFound();

  return (
    <div className="page-container py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--gray-500)]">
        <Link href="/universities" className="hover:text-[var(--navy)]">Universities</Link>
        <span> / </span>
        <span className="text-[var(--navy)]">{uni.name}</span>
      </nav>

      <div className="mt-4">
        <h1 className="section-title">{uni.name}</h1>
        {uni.nameZh && <p className="text-lg text-gray-400">{uni.nameZh}</p>}
        <p className="mt-1 text-gray-600">
          {[uni.city, uni.province, uni.country].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Source status: {uni.dataStatus}. {uni.officialUrl ? "Official site is linked." : "No official site is stored."}
        </p>
        {uni.agencyNumber && (
          <span className="mt-2 inline-block badge-navy">
            CSC Agency Number: {uni.agencyNumber}
          </span>
        )}
      </div>

      {uni.description && (
        <p className="mt-6 max-w-3xl text-gray-700">{uni.description}</p>
      )}

      {uni.officialUrl && (
        <a
          href={uni.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-[var(--teal)] hover:underline"
        >
          Official website →
        </a>
      )}

      {/* Programs */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-[var(--navy)]">Programs</h2>
        {uni.programs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No programs listed yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Degree</th>
                  <th className="pb-2 pr-4 font-medium">Major</th>
                  <th className="pb-2 pr-4 font-medium">Language</th>
                  <th className="pb-2 font-medium">Deadline</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {uni.programs.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-[var(--navy)]">{p.degree}</td>
                    <td className="py-3 pr-4">{p.major}</td>
                    <td className="py-3 pr-4">{p.teachingLang ?? "—"}</td>
                    <td className="py-3 text-amber-800">Unverified · {p.deadline ?? "No date stored"}</td>
                    <td className="py-3"><SaveOpportunityButton programId={p.id} label="Save program" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Scholarships */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-[var(--navy)]">Scholarships</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {uni.scholarships.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--navy)]">{s.name}</h3>
                {s.type && <span className="badge-teal">{s.type}</span>}
              </div>
              {s.deadline && (
                <p className="mt-1 text-xs text-amber-800">Unverified · {s.deadline}</p>
              )}
              {s.officialUrl && (
                <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-[var(--teal)]">Official source</a>
              )}
              <SaveOpportunityButton scholarshipId={s.id} label="Save scholarship" />
              {s.requirements && (
                <p className="mt-2 text-sm text-gray-600">{s.requirements}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Professors */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-[var(--navy)]">
          Professors ({uni.professors.length})
        </h2>
        {uni.professors.length === 0 ? (
          <p className="mt-3 max-w-2xl rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Verified faculty data is not available for this university yet. The university remains listed so programs and official links can still be reviewed. No faculty records are created until an official directory or academic source is imported.
          </p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {uni.professors.map((p) => (
              <ProfessorCard
                key={p.id}
                id={p.id}
                name={p.name}
                nameZh={p.nameZh}
                position={p.position}
                department={p.department}
                universityName={uni.name}
                universityCity={uni.city}
                researchAreas={p.researchAreas.map((r) => r.researchArea.name)}
                researchInterests={p.researchInterests}
                verified={p.dataStatus === "verified"}
                email={p.email}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
