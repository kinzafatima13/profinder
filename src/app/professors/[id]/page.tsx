
function sourceDisplay(profileUrl: string | null, dataStatus: string) {
  if (!profileUrl) {
    return {
      source: "Not recorded",
      verification: "Verification source unavailable",
      href: null as string | null,
      tone: "text-gray-600",
    };
  }
  if (profileUrl.includes("openalex.org")) {
    return {
      source: "OpenAlex",
      verification: "Academic database source — not independently verified",
      href: profileUrl,
      tone: "text-amber-800",
    };
  }
  if (dataStatus === "verified") {
    return {
      source: "Official university faculty page",
      verification: "Verified from official university source",
      href: profileUrl,
      tone: "text-emerald-800",
    };
  }
  return {
    source: "Recorded profile URL",
    verification: "Not independently verified",
    href: profileUrl,
    tone: "text-gray-700",
  };
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { computeResearchMatch, profileGaps } from "@/lib/matching";
import SaveToTrackerButton from "@/components/SaveToTrackerButton";
import EmailGeneratorButton from "@/components/EmailGeneratorButton";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function ProfessorDetailPage({ params }: Props) {
  const prof = await prisma.professor.findUnique({
    where: { id: params.id },
    include: {
      university: true,
      researchAreas: { include: { researchArea: true } },
    },
  });
  if (!prof) notFound();

  const session = await getServerSession(authOptions);
  const student = session?.user?.email
    ? await prisma.student.findUnique({ where: { email: session.user.email } })
    : null;

  const gaps = student
    ? profileGaps({
        researchInterests: student.researchInterests,
        major: student.major,
        degree: student.degree,
      })
    : [];

  const match = student
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
          researchInterests: prof.researchInterests,
          department: prof.department,
          position: prof.position,
          publications: prof.publications,
          researchAreas: prof.researchAreas.map((r) => ({
            name: r.researchArea.name,
            keywords: r.researchArea.keywords,
          })),
        }
      )
    : null;

  const personalProfile = Boolean(prof.profileUrl && prof.profileIsPersonal);
  const statusLabel =
    prof.dataStatus === "verified"
      ? "Verified"
      : prof.dataStatus === "needs_review"
      ? "Needs review"
      : prof.dataStatus === "outdated"
      ? "Possibly outdated"
      : "Unverified";

  return (
    <div className="page-container py-10">
      <Link href="/professors" className="text-sm text-[var(--teal)] hover:underline">
        ← All professors
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <h1 className="section-title break-words">
            {prof.name}
            {prof.nameZh && (
              <span className="ml-2 text-xl font-normal text-gray-400">{prof.nameZh}</span>
            )}
          </h1>
          <p className="mt-1 text-gray-600">
            {prof.position || "Position not listed"}
            {prof.department ? ` · ${prof.department}` : ""}
          </p>
          <p className="text-gray-500">
            <Link href={`/universities/${prof.university.id}`} className="text-[var(--teal)] hover:underline">
              {prof.university.name}
            </Link>
            {prof.university.city ? ` · ${prof.university.city}` : ""}
          </p>
          {prof.school && <p className="mt-1 text-sm text-gray-500">{prof.school}</p>}

          {(() => {
            const source = sourceDisplay(prof.profileUrl, prof.dataStatus);
            return (
              <section className="mt-4 max-w-xl rounded-lg border border-gray-200 bg-white p-4 text-sm">
                <p className="font-semibold text-[var(--navy)]">Source</p>
                {source.href ? (
                  <a href={source.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-[var(--teal)] hover:underline">
                    {source.source}
                  </a>
                ) : (
                  <p className="mt-1 text-gray-700">{source.source}</p>
                )}
                <p className="mt-3 font-semibold text-[var(--navy)]">Verification</p>
                <p className={`mt-1 ${source.tone}`}>{source.verification}</p>
              </section>
            );
          })()}

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="badge-navy">{statusLabel}</span>
            {prof.verifiedAt && (
              <span className="badge-teal">
                Last verified {prof.verifiedAt.toISOString().slice(0, 10)}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {prof.email ? (
              <a href={`mailto:${prof.email}`} className="btn-secondary text-sm break-all">
                {prof.email}
              </a>
            ) : (
              <span className="text-sm text-gray-400">Email not listed</span>
            )}
            {personalProfile ? (
              <a href={prof.profileUrl!} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
                Personal profile →
              </a>
            ) : prof.university.officialUrl ? (
              <a href={prof.university.officialUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
                University website (not a personal profile) →
              </a>
            ) : (
              <span className="text-sm text-gray-400">No personal profile URL on file</span>
            )}
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-[var(--navy)]">Research areas</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {prof.researchAreas.length === 0 && (
                <span className="text-sm text-gray-400">Not available</span>
              )}
              {prof.researchAreas.map((r) => (
                <Link
                  key={r.researchAreaId}
                  href={`/professors?area=${encodeURIComponent(r.researchArea.name)}`}
                  className="badge-teal hover:opacity-80"
                >
                  {r.researchArea.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-[var(--navy)]">Research interests</h2>
            <p className="mt-2 leading-relaxed text-gray-700">
              {prof.researchInterests || "Not available"}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-[var(--navy)]">Publications</h2>
            <p className="mt-2 text-sm text-gray-600">
              {prof.publications || "Individual publications are not on file. Do not treat this profile as a publication list."}
            </p>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-24 p-6">
            <h2 className="text-lg font-bold text-[var(--navy)]">Your research match</h2>
            {!student && (
              <p className="mt-3 text-sm text-gray-600">
                Sign in to see your personalized research match.
              </p>
            )}
            {student && gaps.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                Complete your profile to improve this match. Missing: {gaps.join(", ")}.
              </p>
            )}
            {match && !match.incomplete && (
              <>
                <div className="mt-4 text-center text-5xl font-bold text-[var(--navy)]">{match.score}%</div>
                <p className="mt-2 text-sm text-gray-700">{match.explanation}</p>
                <ul className="mt-3 space-y-1 text-xs text-gray-500">
                  <li>Interest similarity (40%): {match.breakdown.interestOverlap}%</li>
                  <li>Research-area similarity (20%): {match.breakdown.areaOverlap}%</li>
                  <li>Topic keywords on file (20%): {match.breakdown.topicOverlap}%</li>
                  <li>Major relevance (10%): {match.breakdown.majorRelevance}%</li>
                  <li>Degree relevance (10%): {match.breakdown.degreeRelevance}%</li>
                </ul>
              </>
            )}
            <div className="mt-4 space-y-2">
              <Link href={student ? "/profile" : "/login"} className="btn-secondary block text-center text-sm">
                {student ? "Edit profile" : "Sign in"}
              </Link>
              <SaveToTrackerButton professorId={prof.id} />
              <EmailGeneratorButton professorId={prof.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
