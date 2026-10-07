"use client";

import { useState } from "react";
import Link from "next/link";
import MatchScore from "@/components/MatchScore";

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
  target: { level: "High" | "Medium" | "Low"; reasons: string[] };
  match: {
    score: number;
    explanation: string;
    reasons: string[];
    strongAreas: string[];
    breakdown: {
      interestOverlap: number;
      areaOverlap: number;
      topicOverlap: number;
      majorRelevance: number;
      degreeRelevance: number;
    };
  };
};

export default function FindProfessorsPage() {
  const [degree, setDegree] = useState("Master");
  const [major, setMajor] = useState("");
  const [interests, setInterests] = useState("");
  const [skills, setSkills] = useState("");
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

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Find my match</h1>
      <p className="mt-1 max-w-2xl text-gray-600">
        Compare your degree, discipline, and research interests with stored supervisor records. The score explains stored overlap. It is not an admission decision, and it does not mean a supervisor is accepting students.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Degree</label>
            <select className="input" value={degree} onChange={(e) => setDegree(e.target.value)}>
              <option value="Master">Master's</option>
              <option value="PhD">PhD</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Discipline or major</label>
            <input className="input" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Psychology, mechanical engineering, public health..." />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Research interests</label>
          <textarea className="input min-h-[80px]" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Any field. Examples: climate adaptation, corporate finance, immunology." />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Methods, tools, or background <span className="font-normal text-gray-500">optional</span></label>
          <input className="input" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Lab methods, statistics, languages, fieldwork. Not only programming." />
        </div>

        <button type="submit" className="btn-primary" disabled={loading || !interests.trim()}>
          {loading ? "Matching..." : "Find matching supervisors"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {results && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-[var(--navy)]">
            {results.length} stored supervisor{results.length !== 1 ? "s" : ""} with overlap
          </h2>
          <p className="mt-1 text-sm text-gray-500">Sorted by the existing research-match score. Missing fields stay blank.</p>
          <div className="mt-6 space-y-4">
            {results.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link href={`/professors/${r.id}`} className="text-lg font-semibold text-[var(--navy)] hover:text-[var(--teal)]">
                      {r.name}
                      {r.nameZh && <span className="ml-2 text-sm font-normal text-gray-400">{r.nameZh}</span>}
                    </Link>
                    <p className="text-sm text-gray-600">{r.position}{r.department && ` · ${r.department}`}</p>
                    <p className="text-sm text-gray-500">{r.universityName}{r.universityCity && ` · ${r.universityCity}`}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.researchAreas.map((a) => <span key={a} className="badge-teal">{a}</span>)}
                    </div>
                    <p className="mt-3 text-sm font-medium text-[var(--navy)]">Why this matches you</p>
                    <p className="mt-1 text-sm text-gray-700">{r.match.explanation}</p>
                    <p className="mt-2 text-xs text-gray-500">{r.verified ? "Verified faculty page on file." : "Verification status: not verified."} Accepting students is not stated unless a source says so.</p>
                    {r.email && <p className="mt-1 break-all text-xs text-gray-600">{r.email}</p>}
                    <div className="mt-3">
                      <MatchScore score={r.match.score} breakdown={r.match.breakdown} reasons={r.match.reasons} />
                    </div>
                  </div>
                  <div className="shrink-0 sm:w-44">
                    <Link href={`/professors/${r.id}`} className="btn-secondary text-xs">View profile</Link>
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
