import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { applicationPlan, parseDocuments } from "@/lib/application-plan";
import { topProfessorMatches, topScholarshipMatches } from "@/lib/profile-matches";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let uniCount = 0;
  let profCount = 0;
  let areaCount = 0;
  let verifiedCount = 0;
  let emailCount = 0;
  let radar: { id: string; university: string; degree: string; major: string; deadline: string | null }[] = [];

  try {
    [uniCount, profCount, areaCount, verifiedCount, emailCount] = await Promise.all([
      prisma.university.count(),
      prisma.professor.count(),
      prisma.researchArea.count(),
      prisma.professor.count({ where: { dataStatus: "verified" } }),
      prisma.professor.count({ where: { AND: [{ email: { not: null } }, { NOT: { email: "" } }] } }),
    ]);
    const programs = await prisma.program.findMany({
      where: { degree: "Master", major: { contains: "Computer" } },
      include: { university: { select: { name: true } } },
      orderBy: { university: { name: "asc" } },
      take: 8,
    });
    radar = programs.map((program) => ({
      id: program.id,
      university: program.university.name,
      degree: program.degree,
      major: program.major,
      deadline: program.deadline,
    }));
  } catch {
    // DB not ready yet
  }

  const session = await getServerSession(authOptions);
  const student = session?.user?.email
    ? await prisma.student.findUnique({ where: { email: session.user.email } })
    : null;
  const matches = student ? await topProfessorMatches(student, 3) : [];
  const scholarships = student ? await topScholarshipMatches(student, 3) : [];
  const applications = student
    ? await prisma.application.findMany({
        where: { studentId: student.id },
        include: { professor: { include: { university: true } } },
        orderBy: { updatedAt: "desc" },
        take: 3,
      })
    : [];
  const next = applications[0]
    ? applicationPlan({
        hasProfile: Boolean(student?.degree && student?.researchInterests),
        hasEnglish: Boolean(student?.englishTest?.trim()),
        hasTarget: true,
        status: applications[0].status,
        documents: parseDocuments(applications[0].documentsJson),
      }).next
    : student?.researchInterests
      ? "Save a professor or scholarship, then open the tracker."
      : "Save your research profile before the dashboard can rank opportunities.";

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ProFinder",
        url: SITE,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE}/professors?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }) }} />
      {/* Hero */}
      <section className="border-b border-[var(--gray-200)] bg-white pt-12 pb-8">
        <div className="page-container text-center">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--gray-500)]">University and professor discovery</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--navy)] sm:text-4xl">
            Discover the universities and professors that actually match your research.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--gray-700)]">
            Start with a country and a program, compare supervisors by research overlap, then keep the application in the tracker.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/find" className="btn-primary">Find Professors for Me</Link>
            <Link href="/universities" className="btn-secondary">Explore Universities</Link>
          </div>

          {/* Stats */}
          {(uniCount > 0 || profCount > 0) && (
            <>
            <p className="mt-10 text-xs font-medium uppercase tracking-[0.14em] text-[var(--gray-500)]">ProFinder intelligence</p>
            <dl className="mx-auto mt-4 grid max-w-3xl grid-cols-2 sm:grid-cols-4">
              {[
                [uniCount, "Universities"],
                [profCount, "Professors"],
                [verifiedCount, "Verified profiles"],
                [emailCount, "Public emails"],
              ].map(([value, label]) => (
                <div key={String(label)} className="px-3 py-2">
                  <dd className="text-3xl font-semibold text-[var(--navy)]">{value}</dd>
                  <dt className="mt-1 text-xs text-[var(--muted)]">{label}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-[var(--muted)]">{areaCount} research areas are also stored.</p>
            </>
          )}
        </div>
      </section>

      {student && (
        <section className="page-container py-8">
          <h2 className="section-title">Your dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">Next: {next}</p>
          <p className="mt-1 text-sm text-gray-600">Funding goal: {student.fundingGoals?.trim() || "not saved"}. Stored deadlines are unverified, so no countdown is shown.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <article className="card p-4">
              <h3 className="font-semibold text-[var(--navy)]">Professor matches</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {matches.map((row) => (
                  <li key={row.id}><Link className="font-medium text-[var(--navy)]" href={`/professors/${row.id}`}>{row.name}</Link> · {row.match.score}% · {row.university}</li>
                ))}
                {matches.length === 0 && <li>Save research interests to see matches.</li>}
              </ul>
            </article>
            <article className="card p-4">
              <h3 className="font-semibold text-[var(--navy)]">Scholarships</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {scholarships.map((row) => (
                  <li key={row.id}>{row.name} · {row.fit.score}% · {row.university}</li>
                ))}
                {scholarships.length === 0 && <li>No scholarship record is stored.</li>}
              </ul>
            </article>
            <article className="card p-4">
              <h3 className="font-semibold text-[var(--navy)]">Applications</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {applications.map((row) => (
                  <li key={row.id}>{row.professor?.name || row.programName || "Saved item"} · {row.status}</li>
                ))}
                {applications.length === 0 && <li>Nothing is on the tracker yet.</li>}
              </ul>
              <Link href="/tracker" className="mt-3 inline-flex text-sm font-semibold text-[var(--teal)]">Open tracker</Link>
            </article>
          </div>
        </section>
      )}

      <section className="page-container pb-4">
        <h2 className="section-title">Deadline radar</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          A countdown appears only when the date was verified from an official source. These program notes are not verified, so no countdown is shown.
        </p>
        <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white">
          {radar.map((item) => (
            <li key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <span>
                <span className="block text-sm font-medium text-[var(--navy)]">{item.university}</span>
                <span className="block text-sm text-[var(--gray-500)]">{item.degree} · {item.major}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="badge-muted">Unverified</span>
                <span className="text-sm text-[var(--gray-700)]">Check official admissions page</span>
              </span>
            </li>
          ))}
          {radar.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No program notes are stored yet.</li>}
        </ul>
        <Link href="/scholarship" className="mt-4 inline-flex text-sm font-semibold text-[var(--teal)]">
          See scholarship matches
        </Link>
      </section>

      {/* Journey */}
      <section className="page-container py-16">
        <h2 className="section-title text-center">The core journey</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
          From country to application tracker — one clear path.
        </p>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Country", false],
            ["02", "University", false],
            ["03", "Program", false],
            ["04", "Research", false],
            ["05", "Professor", false],
            ["06", "Match", true],
            ["07", "Outreach", false],
            ["08", "Application", false],
          ].map(([number, label, active]) => (
            <li key={String(number)} className={`border-t pt-3 ${active ? "border-[var(--teal)]" : "border-[var(--gray-200)]"}`}>
              <p className={`text-xs font-medium ${active ? "text-[var(--teal)]" : "text-[var(--muted)]"}`}>{number}</p>
              <p className="mt-1 text-sm font-medium text-[var(--navy)]">{label}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="page-container">
          <h2 className="section-title text-center">Built for international applicants</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "University & Program Discovery",
                desc: "Browse Chinese universities, English-taught Master's & PhD programs, CSC and university scholarships — with official links.",
              },
              {
                title: "Professor Discovery",
                desc: "Find professors by research area, major, or university. See research interests, departments, and official profiles.",
              },
              {
                title: "Transparent Research Match",
                desc: "See a clear match percentage with weighted components and an explanation — not a black-box score.",
              },
              {
                title: "Find Professors for Me",
                desc: "Enter your degree, major, and research interests. Get ranked professors with match explanations.",
              },
              {
                title: "Personalized Outreach",
                desc: "Generate research-aware emails you can edit and approve before sending. You stay in control.",
              },
              {
                title: "Application Tracker",
                desc: "Save universities and professors. Track status from Email Draft to Accepted — plus CSC workspace.",
              },
            ].map((f) => (
              <div key={f.title} className="card p-6">
                <h3 className="font-semibold text-[var(--navy)]">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page-container py-16 text-center">
        <h2 className="section-title">Start discovering</h2>
        <p className="mx-auto mt-2 max-w-lg text-gray-600">
          China MVP focused on Computer Science, AI, Cybersecurity, and related fields.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/universities" className="btn-primary">
            Explore Universities
          </Link>
          <Link href="/professors" className="btn-secondary">
            Browse Professors
          </Link>
        </div>
      </section>
    </div>
  );
}
