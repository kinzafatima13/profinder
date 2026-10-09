"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EligibilityButton from "@/components/EligibilityButton";
import SaveOpportunityButton from "@/components/SaveOpportunityButton";
import PageHeader from "@/components/PageHeader";

type Uni = { id: string; name: string };
type Sch = {
  id: string;
  name: string;
  type: string | null;
  deadline: string | null;
  advantages: string | null;
  requirements: string | null;
  officialUrl: string | null;
  dataStatus: string | null;
  university: { name: string } | null;
};

type Reason = { tone: "ok" | "warn"; text: string };
type Opportunity = {
  id: string;
  name?: string;
  type?: string | null;
  university: string;
  degree?: string;
  major?: string;
  deadline: string | null;
  score: number | null;
  reasons: Reason[];
  officialUrl?: string | null;
};

export default function ScholarshipPage() {
  const [rows, setRows] = useState<Sch[]>([]);
  const [unis, setUnis] = useState<Uni[]>([]);
  const [universityId, setUniversityId] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [programs, setPrograms] = useState<Opportunity[]>([]);
  const [matches, setMatches] = useState<Opportunity[]>([]);
  const [matchNote, setMatchNote] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const load = useCallback(async (nextUni = universityId, nextType = type, nextQ = q) => {
    setListLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams();
      if (nextUni) params.set("universityId", nextUni);
      if (nextType) params.set("type", nextType);
      if (nextQ.trim()) params.set("q", nextQ.trim());
      const res = await fetch(`/api/scholarships?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load scholarships");
      const data = await res.json();
      setRows(data.scholarships || []);
      setUnis(data.universities || []);
    } catch {
      setListError("Scholarships could not be loaded. Try again or browse universities.");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [universityId, type, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setFeaturedLoading(true);
    fetch("/api/opportunities")
      .then((res) => res.json())
      .then((data) => {
        setPrograms(data.programs || []);
        setMatches(data.scholarships || []);
        setSignedIn(Boolean(data.signedIn));
        setProfileReady(Boolean(data.profileReady));
        if (!data.signedIn) {
          setMatchNote(
            "Browse real stored awards below. Sign in and save your degree, major, and interests to see compatibility scores."
          );
        } else if (!data.profileReady) {
          setMatchNote("Add a degree, major, or research interests on your profile to score these opportunities.");
        } else {
          setMatchNote("Scores use your saved profile. A warning means the fact is missing or not an official rule.");
        }
      })
      .catch(() => setMatchNote("Featured opportunities could not be loaded."))
      .finally(() => setFeaturedLoading(false));
  }, []);

  function clearFilters() {
    setUniversityId("");
    setType("");
    setQ("");
    setQInput("");
  }

  const filtersActive = Boolean(universityId || type || q);
  const hasFeatured = programs.length > 0 || matches.length > 0;

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Funding"
        description="CSC, university, and presidential awards currently stored. Dates are unverified until checked against the official page."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/universities" className="btn-secondary text-sm">
              Universities
            </Link>
            <Link href="/programs" className="btn-secondary text-sm">
              Programs
            </Link>
            {!signedIn && (
              <Link href="/login?callbackUrl=/scholarship" className="btn-primary text-sm">
                Sign in to score matches
              </Link>
            )}
            {signedIn && !profileReady && (
              <Link href="/profile" className="btn-primary text-sm">
                Complete profile
              </Link>
            )}
          </div>
        }
      />

      {/* Featured discovery — always useful for new visitors */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--navy)]">
          {signedIn && profileReady ? "Scholarship match" : "Start here"}
        </h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">{matchNote}</p>

        {featuredLoading && (
          <p className="mt-4 text-sm text-[var(--gray-500)]">Loading featured opportunities…</p>
        )}

        {!featuredLoading && !hasFeatured && (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--gray-200)] bg-white px-6 py-8 text-center">
            <p className="text-sm text-[var(--gray-600)]">
              Featured samples are unavailable right now. Use the catalog below or open a university page.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setType("CSC")}>
                Show CSC awards
              </button>
              <Link href="/universities" className="btn-primary text-sm">
                Browse universities
              </Link>
            </div>
          </div>
        )}

        {!featuredLoading && hasFeatured && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {matches.slice(0, 4).map((item) => (
              <article key={item.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="badge-teal">{item.type || "Award"}</span>
                  {item.score !== null ? (
                    <p className="text-xs font-semibold text-[var(--teal-dark)]">{item.score}% compatibility</p>
                  ) : (
                    <p className="text-xs text-[var(--gray-500)]">Browse · not scored yet</p>
                  )}
                </div>
                <h3 className="mt-2 font-semibold text-[var(--navy)]">{item.name}</h3>
                <p className="text-sm text-[var(--gray-600)]">{item.university}</p>
                {item.deadline && (
                  <p className="mt-1 text-xs text-[var(--gray-500)]">Window: {item.deadline}</p>
                )}
                {item.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-[var(--gray-700)]">
                    {item.reasons.slice(0, 3).map((reason) => (
                      <li key={reason.text}>
                        {reason.tone === "ok" ? "Yes — " : "Check — "}
                        {reason.text}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <EligibilityButton kind="scholarship" id={item.id} />
                  {item.officialUrl && (
                    <a
                      className="text-sm font-medium text-[var(--teal-dark)] hover:underline"
                      href={item.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Official source
                    </a>
                  )}
                </div>
              </article>
            ))}
            {programs.slice(0, 4).map((item) => (
              <article key={item.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="badge-muted">Program</span>
                  {item.score !== null ? (
                    <p className="text-xs font-semibold text-[var(--teal-dark)]">{item.score}% compatibility</p>
                  ) : (
                    <p className="text-xs text-[var(--gray-500)]">Browse · not scored yet</p>
                  )}
                </div>
                <h3 className="mt-2 font-semibold text-[var(--navy)]">{item.university}</h3>
                <p className="text-sm text-[var(--gray-600)]">
                  {item.degree} · {item.major}
                </p>
                {item.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-[var(--gray-700)]">
                    {item.reasons.slice(0, 3).map((reason) => (
                      <li key={reason.text}>
                        {reason.tone === "ok" ? "Yes — " : "Check — "}
                        {reason.text}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <EligibilityButton kind="program" id={item.id} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Catalog filters */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--navy)]">All stored scholarships</h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">
          Filter by university or type. Every row is stored data — confirm deadlines on the official page before applying.
        </p>

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(qInput.trim());
          }}
        >
          <input
            className="input max-w-xs"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search name, university, or keyword"
            aria-label="Search scholarships"
          />
          <select
            className="input max-w-xs"
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            aria-label="Filter by university"
          >
            <option value="">All universities</option>
            {unis.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            className="input max-w-[11rem]"
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="CSC">CSC</option>
            <option value="University">University</option>
            <option value="Presidential">Presidential</option>
          </select>
          <button className="btn-primary text-sm" type="submit">
            Search
          </button>
          {filtersActive && (
            <button type="button" className="btn-secondary text-sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </form>

        {/* Quick type chips for visitors */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: "CSC", value: "CSC" },
            { label: "University", value: "University" },
            { label: "Presidential", value: "Presidential" },
          ].map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={
                type === chip.value
                  ? "rounded-full bg-[var(--navy)] px-3 py-1 text-xs font-medium text-white"
                  : "rounded-full border border-[var(--gray-200)] bg-white px-3 py-1 text-xs font-medium text-[var(--navy)] hover:border-[var(--teal)]"
              }
              onClick={() => setType(type === chip.value ? "" : chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {listLoading && (
          <p className="mt-6 text-sm text-[var(--gray-500)]">Loading scholarships…</p>
        )}

        {listError && !listLoading && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {listError}{" "}
            <Link href="/universities" className="font-semibold underline">
              Browse universities
            </Link>
          </div>
        )}

        {!listLoading && !listError && rows.length === 0 && (
          <div className="empty-state mt-6 rounded-lg border border-dashed border-[var(--gray-200)] bg-white px-6 py-12 text-center">
            <p className="text-base font-medium text-[var(--navy)]">No scholarships match that filter</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-600)]">
              Try another university, clear filters, or open CSC awards — there are stored opportunities for most listed schools.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {filtersActive && (
                <button type="button" className="btn-primary text-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => {
                  setType("CSC");
                  setUniversityId("");
                  setQ("");
                  setQInput("");
                }}
              >
                Show CSC awards
              </button>
              <Link href="/universities" className="btn-secondary text-sm">
                Browse universities
              </Link>
              <a
                href="https://www.campuschina.org/"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-sm"
              >
                Campus China (official)
              </a>
            </div>
          </div>
        )}

        {!listLoading && rows.length > 0 && (
          <>
            <p className="mt-4 text-xs text-[var(--gray-500)]">
              {rows.length} stored award{rows.length === 1 ? "" : "s"}
              {filtersActive ? " matching your filters" : ""}.
            </p>
            <div className="mt-4 grid gap-4">
              {rows.map((row) => (
                <article key={row.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-[var(--navy)]">{row.name}</h3>
                    <span className="badge-teal">{row.type}</span>
                  </div>
                  <p className="text-sm text-[var(--gray-500)]">
                    {row.university?.name || "University not linked"} · {row.dataStatus || "unverified"}
                  </p>
                  <p className="mt-2 text-sm">Apply window: {row.deadline || "Not available — check official page"}</p>
                  {row.advantages && (
                    <p className="mt-1 text-sm text-[var(--gray-700)]">{row.advantages}</p>
                  )}
                  {row.requirements && (
                    <p className="mt-1 text-sm text-[var(--gray-500)]">{row.requirements}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <EligibilityButton kind="scholarship" id={row.id} />
                    <SaveOpportunityButton scholarshipId={row.id} label="Save scholarship" />
                    {row.officialUrl && (
                      <a
                        className="text-sm font-medium text-[var(--teal-dark)] hover:underline"
                        href={row.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official source
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
