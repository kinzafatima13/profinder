"use client";

import { useState } from "react";
import Link from "next/link";

type University = { id: string; name: string; nameZh: string | null; city: string | null; country?: string | null };
type Professor = { id: string; name: string; nameZh: string | null; universityName: string; researchAreas: string[] };
type Program = { id: string; degree: string; major: string; universityId: string; university: string; country: string | null; city: string | null; deadline: string | null; verificationStatus: string | null; funding: string };
type Scholarship = { id: string; name: string; type: string | null; fundingCoverage?: string; university: { name: string } | null; deadline: string | null; officialUrl: string | null; dataStatus: string | null };

type SearchResult = {
  universities: University[];
  programs: Program[];
  scholarships: Scholarship[];
  professors: Professor[];
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    const query = encodeURIComponent(q.trim());
    try {
      const [unis, programs, scholarships, professors] = await Promise.all([
        fetch(`/api/universities?q=${query}`).then((res) => res.json()),
        fetch(`/api/programs?q=${query}`).then((res) => res.json()),
        fetch(`/api/scholarships?q=${query}`).then((res) => res.json()),
        fetch(`/api/professors?q=${query}`).then((res) => res.json()),
      ]);
      setResults({
        universities: (unis.universities ?? []).slice(0, 20),
        programs: programs.programs ?? [],
        scholarships: scholarships.scholarships ?? [],
        professors: professors.professors ?? [],
      });
    } catch {
      setResults({ universities: [], programs: [], scholarships: [], professors: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Search opportunities</h1>
      <p className="mt-1 max-w-2xl text-gray-600">
        Search stored universities, programs, scholarships, and supervisors. A query such as psychology, mechanical engineering, or public health is valid. Empty sections mean that record is not in the database yet.
      </p>

      <form onSubmit={handleSearch} className="mt-6 flex max-w-xl gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Discipline, university, country, or scholarship" />
        <button type="submit" className="btn-primary shrink-0" disabled={loading}>{loading ? "..." : "Search"}</button>
      </form>

      {results && (
        <div className="mt-10 space-y-10">
          <section>
            <h2 className="text-lg font-bold text-[var(--navy)]">Universities ({results.universities.length})</h2>
            {results.universities.length === 0 ? <p className="mt-2 text-sm text-gray-500">No stored university matches.</p> : (
              <ul className="mt-3 space-y-2">
                {results.universities.map((u) => (
                  <li key={u.id}><span className="mr-2 text-xs uppercase text-gray-400">University</span><Link href={`/universities/${u.id}`} className="text-[var(--teal)] hover:underline">{u.name}</Link>{u.city && <span className="ml-2 text-sm text-gray-400">{u.city}</span>}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--navy)]">Programs ({results.programs.length})</h2>
            {results.programs.length === 0 ? <p className="mt-2 text-sm text-gray-500">No stored program matches.</p> : (
              <ul className="mt-3 space-y-3">
                {results.programs.map((p) => (
                  <li key={p.id} className="card p-4">
                    <span className="text-xs uppercase text-gray-400">Program</span>
                    <p className="font-semibold text-[var(--navy)]">{p.degree} · {p.major}</p>
                    <p className="text-sm text-gray-600"><Link className="underline" href={`/universities/${p.universityId}`}>{p.university}</Link>{[p.city, p.country].filter(Boolean).length ? ` · ${[p.city, p.country].filter(Boolean).join(", ")}` : ""}</p>
                    <p className="mt-1 text-xs text-gray-500">Funding coverage: unknown unless a source states it. Deadline: {p.deadline || "not verified"}. Status: {p.verificationStatus || "UNVERIFIED"}.</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--navy)]">Scholarships ({results.scholarships.length})</h2>
            {results.scholarships.length === 0 ? <p className="mt-2 text-sm text-gray-500">No stored scholarship matches.</p> : (
              <ul className="mt-3 space-y-3">
                {results.scholarships.map((s) => (
                  <li key={s.id} className="card p-4">
                    <span className="text-xs uppercase text-gray-400">Scholarship</span>
                    <p className="font-semibold text-[var(--navy)]">{s.name}</p>
                    <p className="text-sm text-gray-600">{s.university?.name || "No university linked"} · {s.type || "type not stored"}</p>
                    <p className="mt-1 text-xs text-gray-500">Coverage: {s.fundingCoverage === "CHECK_SOURCE" ? "the stored type mentions full funding; confirm the official source" : "unknown"}. Deadline: {s.deadline || "not verified"}. {s.officialUrl ? <a className="underline" href={s.officialUrl}>Official source</a> : "No official source stored."}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--navy)]">Supervisors ({results.professors.length})</h2>
            {results.professors.length === 0 ? <p className="mt-2 text-sm text-gray-500">No stored supervisor matches.</p> : (
              <ul className="mt-3 space-y-3">
                {results.professors.map((p) => (
                  <li key={p.id} className="card p-4">
                    <span className="text-xs uppercase text-gray-400">Supervisor</span>
                    <Link href={`/professors/${p.id}`} className="ml-2 font-semibold text-[var(--navy)] hover:text-[var(--teal)]">{p.name}</Link>
                    <span className="ml-2 text-sm text-gray-500">{p.universityName}</span>
                    <div className="mt-1 flex flex-wrap gap-1">{p.researchAreas.map((a) => <span key={a} className="badge-teal">{a}</span>)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
