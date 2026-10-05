import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let uniCount = 0;
  let profCount = 0;
  let areaCount = 0;
  let verifiedCount = 0;
  let emailCount = 0;
  let radar: { id: string; university: string; degree: string; major: string; deadline: string | null }[] = [];
  let dbFile = "";

  try {
    [uniCount, profCount, areaCount, verifiedCount, emailCount] = await Promise.all([
      prisma.university.count(),
      prisma.professor.count(),
      prisma.researchArea.count(),
      prisma.professor.count({ where: { dataStatus: "verified" } }),
      prisma.professor.count({ where: { AND: [{ email: { not: null } }, { NOT: { email: "" } }] } }),
    ]);
    const rows = await prisma.$queryRawUnsafe<Array<{ file: string }>>("PRAGMA database_list");
    dbFile = rows?.[0]?.file ?? "";
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

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-[var(--gray-50)] pt-16 pb-20">
        <div className="page-container text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--navy)] shadow-sm">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#0a2540" strokeWidth="2.2" />
              <path d="M16 16 L20 20" stroke="#0a2540" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M11 8 L11 14 M8 11 L14 11" stroke="#00b4a6" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-[var(--navy)] sm:text-5xl">
            Discover universities &amp; professors
            <br />
            <span className="text-[var(--teal)]">that match your research</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            PROFINDER helps international students find relevant Chinese universities,
            programs, research areas, and supervisors — then personalize outreach and
            track applications in one place.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/find" className="btn-primary px-6 py-3 text-base">
              Find Professors for Me
            </Link>
            <Link href="/universities" className="btn-secondary px-6 py-3 text-base">
              Browse Universities
            </Link>
          </div>

          {/* Stats */}
          {(uniCount > 0 || profCount > 0) && (
            <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-4">
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-[var(--navy)]">{uniCount}</div>
                <div className="text-xs text-gray-500">Universities</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-[var(--navy)]">{profCount}</div>
                <div className="text-xs text-gray-500">Professors</div>
                <div className="mt-1 text-xs text-[var(--teal)]">{verifiedCount} verified · {emailCount} emails</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-[var(--navy)]">{areaCount}</div>
                <div className="text-xs text-gray-500">Research Areas</div>
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-400">Database file: {dbFile || "not opened"} · {uniCount} universities · {profCount} professors</p>
        </div>
      </section>

      <section className="page-container pb-4">
        <h2 className="section-title">Deadline radar</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          These are notes already stored with the programs. None of them were confirmed from an official admissions notice.
        </p>
        <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white">
          {radar.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-sm font-semibold text-[var(--navy)]">{item.university}</span>
                <span className="block text-sm text-gray-500">{item.degree} · {item.major}</span>
              </span>
              <span className="text-sm font-medium text-amber-800">Unverified · {item.deadline || "No date stored"}</span>
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

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
          {[
            "Country",
            "University",
            "Program",
            "Research Area",
            "Professor",
            "Research Match",
            "Outreach",
            "Tracker",
          ].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--light-teal)] px-3 py-1.5 text-[var(--teal-dark)]">
                {step}
              </span>
              {i < 7 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>
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
