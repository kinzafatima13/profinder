"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SaveToTrackerButton from "@/components/SaveToTrackerButton";
import MatchScore from "@/components/MatchScore";
import PageHeader from "@/components/PageHeader";
import { saveSearch } from "@/lib/saved-searches";

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
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
    if (params.get("country")) setCountry(params.get("country") || "");
    if (params.get("degree")) setDegree(params.get("degree") || "");
    if (params.get("funding")) setFunding(params.get("funding") || "");
    if (params.get("priority")) setPriority(params.get("priority") || "balanced");
  }, []);

  function handleSaveSearch() {
    if (!query.trim()) {
      setSaveMsg("Enter a search description first.");
      return;
    }
    saveSearch({ query, country, degree, funding, priority });
    setSaveMsg("Search saved on this device.");
  }

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
      body: JSON.stringify({
        vote,
        reason,
        query,
        professorId: item.professor.id,
        programId: item.program?.id,
        universityId: item.university.id,
      }),
    });
  }

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Find My Match"
        description="Describe what you want to study. ProFinder ranks stored universities, programs, and professors from overlap — it does not invent records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/searches" className="btn-secondary text-sm">
              Saved searches
            </Link>
            <Link href="/onboarding" className="btn-secondary text-sm">
              Get started
            </Link>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="mt-8 max-w-3xl space-y-4">
        <textarea
          className="input min-h-[120px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="I am a Software Engineering graduate interested in AI and computer vision. I want a funded Master’s in China, especially healthcare applications."
          required
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country (optional)"
          />
          <select className="input" value={degree} onChange={(e) => setDegree(e.target.value)}>
            <option value="">Degree</option>
            <option value="Master">Master</option>
            <option value="PhD">PhD</option>
          </select>
          <select className="input" value={funding} onChange={(e) => setFunding(e.target.value)}>
            <option value="">Funding</option>
            <option value="required">Funding preferred</option>
            <option value="any">Any</option>
          </select>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="balanced">Balanced</option>
            <option value="research">Research fit</option>
            <option value="program">Program</option>
            <option value="eligibility">Eligibility</option>
            <option value="location">Location</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary" disabled={loading || query.trim().length < 8}>
            {loading ? "Matching…" : "Find my matches"}
          </button>
          <button type="button" className="btn-secondary" onClick={handleSaveSearch} disabled={!query.trim()}>
            Save search
          </button>
          <Link href="/searches" className="text-sm font-medium text-[var(--teal-dark)] hover:underline">
            View saved
          </Link>
        </div>
        {saveMsg && <p className="text-sm text-[var(--gray-600)]">{saveMsg}</p>}
      </form>

      {loading && (
        <div className="loading-panel mt-8 rounded-lg border border-[var(--gray-200)] bg-white px-4 py-8 text-sm text-[var(--gray-600)]">
          Ranking stored records…
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}{" "}
          {error.toLowerCase().includes("sign in") && (
            <Link href="/login?callbackUrl=/find" className="font-semibold underline">
              Log in
            </Link>
          )}
        </div>
      )}

      {note && !error && <p className="mt-4 text-sm text-[var(--gray-600)]">{note}</p>}

      {results && results.length === 0 && !loading && !error && (
        <div className="empty-state mt-8 rounded-lg border border-dashed border-[var(--gray-200)] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[var(--navy)]">No strong matches in stored records</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-600)]">
            Try broader keywords, or browse professors and programs directly.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/professors" className="btn-primary text-sm">
              Professors
            </Link>
            <Link href="/programs" className="btn-secondary text-sm">
              Programs
            </Link>
            <button type="button" className="btn-secondary text-sm" onClick={handleSaveSearch}>
              Save this search
            </button>
          </div>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-8 grid gap-4">
          {results.map((item) => {
            const key = `${item.professor.id}-${item.program?.id || "none"}`;
            return (
              <article key={key} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--navy)]">{item.professor.name}</h2>
                    <p className="text-sm text-[var(--gray-600)]">
                      {item.professor.position || "Faculty"}
                      {item.professor.department ? ` · ${item.professor.department}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-[var(--gray-600)]">
                      <Link href={`/universities/${item.university.id}`} className="font-medium hover:underline">
                        {item.university.name}
                      </Link>
                      {item.university.city ? ` · ${item.university.city}` : ""}
                      {item.program ? ` · ${item.program.degree} · ${item.program.major}` : ""}
                    </p>
                  </div>
                  <MatchScore score={item.score} reasons={item.reasons} />
                </div>
                <ul className="mt-3 space-y-1 text-sm text-[var(--gray-700)]">
                  {item.reasons.slice(0, 4).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--gray-500)]">{item.verificationStatus}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/professors/${item.professor.id}`} className="btn-secondary text-sm">
                    View profile
                  </Link>
                  <SaveToTrackerButton professorId={item.professor.id} />
                  <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(open === key ? null : key)}>
                    Feedback
                  </button>
                </div>
                {open === key && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary text-xs" onClick={() => feedback(item, "up")}>
                      Helpful
                    </button>
                    {REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() => feedback(item, "down", reason)}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
