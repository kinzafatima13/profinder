"use client";

import { useState } from "react";
import Link from "next/link";

type Direction = { label: string; href: string };
type Professor = { id: string; name: string; university: string; department: string | null; interests: string | null; areas: string[]; verified: boolean };
type Program = { label: string; university: string; href: string };
type University = { id: string; name: string; place: string };
type Funding = { name: string; type: string | null; university: string; href: string };
type Explore = { professors: string; programs: string; match: string };

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [understanding, setUnderstanding] = useState("");
  const [limited, setLimited] = useState(false);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [funding, setFunding] = useState<Funding[]>([]);
  const [tracker, setTracker] = useState("");
  const [explore, setExplore] = useState<Explore | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not answer");
      return;
    }
    setUnderstanding(data.understanding || "");
    setLimited(Boolean(data.limited));
    setDirections(data.directions || []);
    setProfessors(data.professors || []);
    setPrograms(data.programs || []);
    setUniversities(data.universities || []);
    setFunding(data.funding || []);
    setTracker(data.tracker || "");
    setExplore(data.explore || null);
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Research assistant</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Describe what you want to study. Answers list only stored professors, programs, universities, and scholarships. If the database does not cover a subject, it says so.
      </p>
      <form onSubmit={ask} className="mt-6 max-w-2xl space-y-3">
        <label className="sr-only" htmlFor="assistant-q">What do you want to study or research?</label>
        <textarea id="assistant-q" className="input min-h-[100px]" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: I want to research AI in healthcare" required />
        <button className="btn-primary" disabled={loading}>{loading ? "Checking stored records..." : "Ask"}</button>
      </form>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {understanding && (
        <div className="mt-8 max-w-3xl space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-500)]">Understanding your interest</h2>
            <p className="mt-2 text-sm text-[var(--gray-700)]">{understanding}</p>
          </section>
          {directions.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-500)]">Possible research directions</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {directions.map((item) => (
                  <Link key={item.href + item.label} href={item.href} className="chip">{item.label}</Link>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-500)]">Relevant professors</h2>
            {professors.length === 0 ? <p className="mt-2 text-sm text-gray-500">No stored professor matched this wording.</p> : (
              <ul className="mt-3 grid gap-3">
                {professors.map((row) => (
                  <li key={row.id} className="card p-4">
                    <p className="text-xs text-[var(--gray-500)]">{row.verified ? "Verified" : "Unverified"}</p>
                    <p className="font-semibold text-[var(--navy)]">{row.name}</p>
                    <p className="text-sm text-gray-600">{row.university}{row.department ? ` · ${row.department}` : ""}</p>
                    <p className="mt-1 text-sm text-gray-700">{row.areas.join(" · ") || row.interests || "Research interests not stored."}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link className="btn-secondary text-xs" href={`/professors/${row.id}`}>View Profile</Link>
                      <Link className="btn-ghost text-xs" href={`/professors/${row.id}?tab=match`}>Research Match</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-500)]">Relevant programs</h2>
            {programs.length === 0 ? <p className="mt-2 text-sm text-gray-500">No stored program matched. Current programs are mostly computer science and related majors.</p> : (
              <ul className="mt-2 space-y-2 text-sm">
                {programs.map((row) => <li key={row.href + row.label}><Link className="font-medium text-[var(--navy)]" href={row.href}>{row.label}</Link> · {row.university}</li>)}
              </ul>
            )}
          </section>
          {universities.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-500)]">Universities</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {universities.map((row) => <li key={row.id}><Link className="font-medium text-[var(--navy)]" href={`/universities/${row.id}`}>{row.name}</Link>{row.place ? ` · ${row.place}` : ""}</li>)}
              </ul>
            </section>
          )}
          {funding.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-500)]">Funding</h2>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {funding.map((row) => <li key={row.name + row.university}><Link href={row.href} className="font-medium text-[var(--navy)]">{row.name}</Link>{row.type ? ` · ${row.type}` : ""} · {row.university}</li>)}
              </ul>
            </section>
          )}
          {tracker && <p className="text-sm text-gray-700">{tracker} <Link className="text-[var(--teal)]" href="/tracker">Applications</Link></p>}
          {explore && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-500)]">Continue exploring</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="btn-primary" href={explore.professors}>View professors</Link>
                <Link className="btn-secondary" href={explore.programs}>View programs</Link>
                <Link className="btn-secondary" href={explore.match}>Find My Match</Link>
              </div>
              {limited && <p className="mt-3 text-sm text-gray-600">I found related wording in the question, but ProFinder currently has limited verified records for this area.</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
