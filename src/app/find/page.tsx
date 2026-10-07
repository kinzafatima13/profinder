"use client";

import { useState } from "react";
import Link from "next/link";
import SaveToTrackerButton from "@/components/SaveToTrackerButton";

type Part = { key: string; label: string; score: number | null; weight: number; note: string };
type MatchItem = {
  university: { id: string; name: string; country: string; city: string | null };
  program: { id: string; degree: string; major: string } | null;
  professor: { id: string; name: string; position: string | null; department: string | null; areas: string[] };
  score: number;
  label: string;
  scoreBreakdown: Part[];
  reasons: string[];
  verificationStatus: string;
  matchedPublicationTitles: string[];
  sourceLinks: { label: string; url: string }[];
};

const REASONS = ["Wrong research area", "Wrong degree", "Wrong country", "Funding mismatch", "Not interested", "Other"];

export default function FindProfessorsPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [degree, setDegree] = useState("");
  const [funding, setFunding] = useState("");
  const [priority, setPriority] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchItem[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, country, degree, funding, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Match request failed");
      setResults(data.matches || []);
      setNote(data.note || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function feedback(item: MatchItem, vote: "up" | "down", reason?: string) {
    await fetch("/api/match/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote, reason, query, professorId: item.professor.id, programId: item.program?.id, universityId: item.university.id }),
    });
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Find your best matches</h1>
      <p className="mt-1 max-w-2xl text-gray-600">Tell us what you want to study. ProFinder ranks stored universities, programs, and professors. It does not invent records.</p>
      <form onSubmit={handleSubmit} className="mt-8 max-w-3xl space-y-4">
        <textarea className="input min-h-[120px]" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="I am a Software Engineering graduate interested in AI and computer vision. I want a funded Master’s in China, especially healthcare applications." required />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (optional)" />
          <select className="input" value={degree} onChange={(e) => setDegree(e.target.value)}>
            <option value="">Degree</option>
            <option value="Master">Master</option>
            <option value="PhD">PhD</option>
          </select>
          <select className="input" value={funding} onChange={(e) => setFunding(e.target.value)}>
            <option value="">Funding</option>
            <option value="required">Funding required</option>
            <option value="not_required">Not required</option>
          </select>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="balanced">Balanced</option>
            <option value="research">Research fit</option>
            <option value="funding">Funding</option>
            <option value="professor">Professor research</option>
            <option value="program">Program</option>
            <option value="eligibility">Eligibility</option>
            <option value="location">Location</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading || query.trim().length < 8}>{loading ? "Matching..." : "Find my matches"}</button>
      </form>
      {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {results && (
        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-bold text-[var(--navy)]">Your top matches</h2>
          <p className="text-sm text-gray-500">{note}</p>
          {results.map((item) => (
            <article key={item.professor.id} className="card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div>
                  <Link href={`/professors/${item.professor.id}`} className="text-lg font-semibold text-[var(--navy)]">{item.professor.name}</Link>
                  <p className="text-sm text-gray-600">{item.professor.position}{item.professor.department ? ` · ${item.professor.department}` : ""}</p>
                  <p className="text-sm text-gray-500">{item.university.name}{item.university.city ? ` · ${item.university.city}` : ""} · {item.university.country}</p>
                  {item.program && <p className="mt-1 text-sm text-gray-700">{item.program.degree} · {item.program.major}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-[var(--navy)]">{item.score}%</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {item.scoreBreakdown.filter((part) => part.weight > 0).slice(0, 3).map((part) => (
                  <div key={part.key}>
                    <div className="flex justify-between text-xs text-gray-600"><span>{part.label}</span><span>{part.score == null ? "Information not available" : `${part.score}`}</span></div>
                    <div className="h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-[var(--teal)]" style={{ width: `${part.score || 0}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm font-medium">Why this matches</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">{item.reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <button type="button" className="mt-2 text-xs text-[var(--teal)]" onClick={() => setOpen(open === item.professor.id ? null : item.professor.id)}>See how this score was calculated</button>
              {open === item.professor.id && (
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  {item.scoreBreakdown.map((part) => <li key={part.key}>{part.label}: {part.score == null ? "Information not available" : part.score} · weight {part.weight}% · {part.note}</li>)}
                  {item.matchedPublicationTitles.map((title) => <li key={title}>Stored publication: {title}</li>)}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/professors/${item.professor.id}`} className="btn-secondary text-xs">View professor</Link>
                <Link href={`/universities/${item.university.id}`} className="btn-secondary text-xs">View university</Link>
                <SaveToTrackerButton professorId={item.professor.id} />
                <button type="button" className="text-xs" onClick={() => feedback(item, "up")}>Good match</button>
                <button type="button" className="text-xs" onClick={() => feedback(item, "down", REASONS[0])}>Not relevant</button>
              </div>
              <p className="mt-2 text-xs text-gray-500">{item.verificationStatus}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
