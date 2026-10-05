"use client";

import { useState } from "react";
import Link from "next/link";

type MatchItem = {
  id: string;
  name: string;
  nameZh: string | null;
  position: string | null;
  department: string | null;
  universityName: string;
  universityCity: string | null;
  researchAreas: string[];
  researchInterests: string | null;
  verified: boolean;
  email: string | null;
  match: {
    score: number;
    explanation: string;
    reasons: string[];
    strongAreas: string[];
    breakdown: {
      interestOverlap: number;
      keywordOverlap: number;
      majorRelevance: number;
      degreeRelevance: number;
    };
  };
};

export default function FindProfessorsPage() {
  const [degree, setDegree] = useState("Master");
  const [major, setMajor] = useState("Computer Science");
  const [interests, setInterests] = useState("Cybersecurity, AI Security, Network Security");
  const [skills, setSkills] = useState("Python, Machine Learning, Network Security");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degree,
          major,
          researchInterests: interests,
          skills,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Match request failed");
      }

      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function matchClass(score: number) {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-gray-500";
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Find Professors for Me</h1>
      <p className="mt-1 max-w-2xl text-gray-600">
        Enter your academic profile. We search the database and return professors
        ranked by transparent research match.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Degree
            </label>
            <select
              className="input"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
            >
              <option value="Master">Master&apos;s</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Major
            </label>
            <input
              className="input"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Research Interests
          </label>
          <textarea
            className="input min-h-[80px]"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g. Cybersecurity, AI Security, Privacy"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Skills
          </label>
          <input
            className="input"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. Python, Machine Learning, Linux"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Matching..." : "Find Matching Professors"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {results && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-[var(--navy)]">
            {results.length} potentially relevant professor
            {results.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Sorted by research match score
          </p>

          <div className="mt-6 space-y-4">
            {results.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link
                      href={`/professors/${r.id}`}
                      className="text-lg font-semibold text-[var(--navy)] hover:text-[var(--teal)]"
                    >
                      {r.name}
                      {r.nameZh && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                          {r.nameZh}
                        </span>
                      )}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {r.position}
                      {r.department && ` · ${r.department}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {r.universityName}
                      {r.universityCity && ` · ${r.universityCity}`}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.researchAreas.map((a) => (
                        <span key={a} className="badge-teal">
                          {a}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 text-sm text-gray-700">
                      {r.match.explanation}
                    </p>
                    {r.verified && <p className="mt-2 text-xs font-semibold text-[var(--teal)]">Verified faculty page</p>}
                    {r.email && <p className="mt-1 break-all text-xs text-gray-600">{r.email}</p>}
                    <ul className="mt-3 space-y-1 text-sm text-gray-700">
                      {r.match.reasons.slice(0, 4).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="shrink-0 text-center sm:text-right">
                    <div className={`text-3xl font-bold ${matchClass(r.match.score)}`}>
                      {r.match.score}%
                    </div>
                    <div className="text-xs text-gray-400">Match</div>
                    <Link
                      href={`/professors/${r.id}`}
                      className="btn-secondary mt-3 text-xs"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
