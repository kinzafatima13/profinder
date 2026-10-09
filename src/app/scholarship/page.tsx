"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [programs, setPrograms] = useState<Opportunity[]>([]);
  const [matches, setMatches] = useState<Opportunity[]>([]);
  const [matchNote, setMatchNote] = useState("");

  const load = useCallback(async (nextUni = universityId, nextType = type) => {
    const q = new URLSearchParams();
    if (nextUni) q.set("universityId", nextUni);
    if (nextType) q.set("type", nextType);
    const res = await fetch(`/api/scholarships?${q.toString()}`);
    const data = await res.json();
    setRows(data.scholarships || []);
    setUnis(data.universities || []);
  }, [universityId, type]);

  useEffect(() => {
    load();
    fetch("/api/opportunities")
      .then((res) => res.json())
      .then((data) => {
        setPrograms(data.programs || []);
        setMatches(data.scholarships || []);
        if (!data.signedIn) setMatchNote("Sign in and save your degree, major, and interests to see why each result matches.");
        else if (!data.profileReady) setMatchNote("Add a degree, major, or research interests on your profile to explain these matches.");
        else setMatchNote("Scores use your saved profile. A warning means the fact is missing or not an official rule.");
      })
      .catch(() => setMatchNote("Matches could not be loaded."));
  }, [load]);

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Funding"
        description="CSC, university, and presidential awards currently stored. Dates are unverified until checked against the official page."
      />
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--navy)]">Scholarship match</h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">
          {matchNote || "Each score is a compatibility check against your saved profile, with the reason beside it."}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {programs.slice(0, 4).map((item) => (
            <article key={item.id} className="card p-4">
              <p className="text-xs font-semibold text-[var(--teal-dark)]">
                {item.score === null ? "Not scored" : `${item.score}% compatibility`}
              </p>
              <h3 className="mt-1 font-semibold text-[var(--navy)]">{item.university}</h3>
              <p className="text-sm text-[var(--gray-600)]">{item.degree} · {item.major}</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--gray-700)]">
                {item.reasons.slice(0, 4).map((reason) => (
                  <li key={reason.text}>{reason.tone === "ok" ? "Yes — " : "Check — "}{reason.text}</li>
                ))}
              </ul>
              <EligibilityButton kind="program" id={item.id} />
            </article>
          ))}
          {matches.slice(0, 4).map((item) => (
            <article key={item.id} className="card p-4">
              <p className="text-xs font-semibold text-[var(--teal-dark)]">
                {item.score === null ? "Not scored" : `${item.score}% compatibility`}
              </p>
              <h3 className="mt-1 font-semibold text-[var(--navy)]">{item.name}</h3>
              <p className="text-sm text-[var(--gray-600)]">{item.university} · {item.type}</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--gray-700)]">
                {item.reasons.slice(0, 4).map((reason) => (
                  <li key={reason.text}>{reason.tone === "ok" ? "Yes — " : "Check — "}{reason.text}</li>
                ))}
              </ul>
              <EligibilityButton kind="scholarship" id={item.id} />
            </article>
          ))}
        </div>
      </section>
      <div className="mt-6 flex flex-wrap gap-2">
        <select className="input max-w-xs" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
          <option value="">All universities</option>
          {unis.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select className="input max-w-xs" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="CSC">CSC</option>
          <option value="University">University</option>
          <option value="Presidential">Presidential</option>
        </select>
      </div>
      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <article key={row.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-[var(--navy)]">{row.name}</h2>
              <span className="badge-teal">{row.type}</span>
            </div>
            <p className="text-sm text-[var(--gray-500)]">
              {row.university?.name} · {row.dataStatus || "unverified"}
            </p>
            <p className="mt-2 text-sm">Apply window: {row.deadline || "Not available"}</p>
            <p className="mt-1 text-sm text-[var(--gray-700)]">{row.advantages || "Advantages not listed"}</p>
            <p className="mt-1 text-sm text-[var(--gray-500)]">{row.requirements}</p>
            <EligibilityButton kind="scholarship" id={row.id} />
            <SaveOpportunityButton scholarshipId={row.id} label="Save scholarship" />
            {row.officialUrl && (
              <a
                className="mt-2 inline-block text-sm font-medium text-[var(--teal-dark)] hover:underline"
                href={row.officialUrl}
                target="_blank"
                rel="noreferrer"
              >
                Official source
              </a>
            )}
          </article>
        ))}
        {rows.length === 0 && (
          <div className="empty-state rounded-lg border border-dashed border-[var(--gray-200)] bg-white px-6 py-12 text-center">
            <p className="text-sm text-[var(--gray-500)]">No scholarships match that filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
