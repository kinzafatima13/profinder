"use client";

import { useState } from "react";
import Link from "next/link";

type SearchResult = {
  universities: { id: string; name: string; nameZh: string | null; city: string | null }[];
  professors: {
    id: string;
    name: string;
    nameZh: string | null;
    universityName: string;
    researchAreas: string[];
  }[];
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const [resUni, resProf] = await Promise.all([
        fetch(`/api/universities?q=${encodeURIComponent(q)}`),
        fetch(`/api/professors?q=${encodeURIComponent(q)}`),
      ]);
      const uniData = await resUni.json();
      const profData = await resProf.json();
      setResults({
        universities: uniData.universities ?? [],
        professors: profData.professors ?? [],
      });
    } catch {
      setResults({ universities: [], professors: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Smart Search</h1>
      <p className="mt-1 text-gray-600">
        Search universities, professors, majors, or research topics.
      </p>

      <form onSubmit={handleSearch} className="mt-6 flex max-w-xl gap-2">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Cybersecurity, UESTC, AI Security, Beijing..."
        />
        <button type="submit" className="btn-primary shrink-0" disabled={loading}>
          {loading ? "..." : "Search"}
        </button>
      </form>

      {results && (
        <div className="mt-10 space-y-10">
          <section>
            <h2 className="text-lg font-bold text-[var(--navy)]">
              Universities ({results.universities.length})
            </h2>
            {results.universities.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No universities found.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {results.universities.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/universities/${u.id}`}
                      className="text-[var(--teal)] hover:underline"
                    >
                      {u.name}
                    </Link>
                    {u.city && (
                      <span className="ml-2 text-sm text-gray-400">{u.city}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--navy)]">
              Professors ({results.professors.length})
            </h2>
            {results.professors.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No professors found.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {results.professors.map((p) => (
                  <li key={p.id} className="card p-4">
                    <Link
                      href={`/professors/${p.id}`}
                      className="font-semibold text-[var(--navy)] hover:text-[var(--teal)]"
                    >
                      {p.name}
                    </Link>
                    <span className="ml-2 text-sm text-gray-500">
                      {p.universityName}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.researchAreas.map((a) => (
                        <span key={a} className="badge-teal">
                          {a}
                        </span>
                      ))}
                    </div>
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
