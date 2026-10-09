"use client";

import { useState } from "react";
import Link from "next/link";
import SaveToTrackerButton from "@/components/SaveToTrackerButton";
import MatchScore from "@/components/MatchScore";
import PageHeader from "@/components/PageHeader";

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
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || query.trim().length < 8}
        >
          {loading ? "Matching…" : "Find my matches"}
        </button>
      </form>

      {loading && (
        <div className="loading-track mt-4 max-w-3xl" role="status" aria-label="Matching stored records">
          <span />
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {results && (
        <div className="results-pane mt-10 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--navy)]">Your top matches</h2>
              <p className="text-sm text-[var(--gray-500)]">{note || `${results.length} stored match${results.length === 1 ? "" : "es"}`}</p>
            </div>
            <Link href="/professors" className="text-sm font-medium text-[var(--teal-dark)] hover:underline">
              Browse all professors
            </Link>
          </div>

          {results.length === 0 ? (
            <div className="empty-state rounded-lg border border-dashed border-[var(--gray-200)] bg-white px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-[var(--navy)]">No stored matches for this query</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-700)]">
                Try broader research interests, or explore professors and programs directly.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/professors" className="btn-primary">Explore professors</Link>
                <Link href="/programs" className="btn-secondary">Browse programs</Link>
              </div>
            </div>
          ) : (
            results.map((item) => {
              const breakdown = {
                interestOverlap: item.scoreBreakdown.find((p) => p.key === "interest" || p.label.toLowerCase().includes("interest"))?.score ?? 0,
                areaOverlap: item.scoreBreakdown.find((p) => p.key === "area" || p.label.toLowerCase().includes("area"))?.score ?? 0,
                topicOverlap: item.scoreBreakdown.find((p) => p.key === "topic" || p.label.toLowerCase().includes("topic"))?.score ?? 0,
                majorRelevance: item.scoreBreakdown.find((p) => p.key === "major" || p.label.toLowerCase().includes("major"))?.score ?? 0,
                degreeRelevance: item.scoreBreakdown.find((p) => p.key === "degree" || p.label.toLowerCase().includes("degree"))?.score ?? 0,
                publicationOverlap:
                  item.scoreBreakdown.find((p) => p.key === "publication" || p.label.toLowerCase().includes("publication"))?.score ?? null,
              };

              return (
                <article key={item.professor.id} className="card p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/professors/${item.professor.id}`}
                        className="text-lg font-semibold text-[var(--navy)] hover:text-[var(--teal)]"
                      >
                        {item.professor.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-[var(--gray-600)]">
                        {item.professor.position}
                        {item.professor.department ? ` · ${item.professor.department}` : ""}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--gray-500)]">
                        {item.university.name}
                        {item.university.city ? ` · ${item.university.city}` : ""} · {item.university.country}
                      </p>
                      {item.program && (
                        <p className="mt-1 text-sm text-[var(--gray-700)]">
                          {item.program.degree} · {item.program.major}
                        </p>
                      )}
                      {item.professor.areas?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.professor.areas.slice(0, 4).map((area) => (
                            <Link
                              key={area}
                              href={`/professors?area=${encodeURIComponent(area)}`}
                              className="tag"
                            >
                              {area}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <MatchScore score={item.score} compact />
                  </div>

                  <div className="mt-4 border-t border-[var(--gray-100)] pt-4">
                    <p className="text-xs font-medium text-[var(--gray-500)]">Why this match?</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--gray-700)]">
                      {item.reasons.slice(0, 4).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-[var(--teal-dark)] hover:underline"
                      onClick={() => setOpen(open === item.professor.id ? null : item.professor.id)}
                    >
                      {open === item.professor.id ? "Hide score details" : "See how this score was calculated"}
                    </button>
                    {open === item.professor.id && (
                      <div className="menu-panel mt-3">
                        <MatchScore score={item.score} breakdown={breakdown} reasons={item.reasons} />
                        {item.matchedPublicationTitles.length > 0 && (
                          <ul className="mt-3 space-y-1 text-xs text-[var(--gray-600)]">
                            {item.matchedPublicationTitles.map((title) => (
                              <li key={title}>Stored publication: {title}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/professors/${item.professor.id}`} className="btn-secondary text-xs">
                      View profile
                    </Link>
                    <Link href={`/universities/${item.university.id}`} className="btn-secondary text-xs">
                      View university
                    </Link>
                    <SaveToTrackerButton professorId={item.professor.id} />
                    <button type="button" className="btn-ghost text-xs" onClick={() => feedback(item, "up")}>
                      Good match
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      onClick={() => feedback(item, "down", REASONS[0])}
                    >
                      Not relevant
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--gray-500)]">{item.verificationStatus}</p>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
