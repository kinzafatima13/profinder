"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

type StoredResult = { type: string; label: string; subtitle: string; href: string };

type LiveResult = {
  openAlexId: string;
  name: string;
  orcid: string | null;
  affiliation: string | null;
  topics: string[];
  profileUrl: string;
  alreadyInDatabase: boolean;
  source: "openalex";
  unverified: true;
};

const TYPE_LABEL: Record<string, string> = {
  professor: "Professors",
  program: "Programs",
  university: "Universities",
  research: "Research",
  field: "Fields",
  discipline: "Disciplines",
  major: "Majors",
  alias: "Related",
};

export default function AcademicSearchBox() {
  const [q, setQ] = useState("");
  const [stored, setStored] = useState<StoredResult[]>([]);
  const [live, setLive] = useState<LiveResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingStored, setLoadingStored] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const boxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const value = q.trim();
    if (value.length < 2) {
      setStored([]);
      setLive([]);
      setLoadingStored(false);
      setLoadingLive(false);
      setLiveError(null);
      return;
    }

    setLoadingStored(true);
    setLoadingLive(true);
    setLiveError(null);

    const timer = setTimeout(async () => {
      // Stored database search
      try {
        const res = await fetch("/api/academic-search?q=" + encodeURIComponent(value));
        if (res.ok) setStored((await res.json()).results || []);
        else setStored([]);
      } catch {
        setStored([]);
      } finally {
        setLoadingStored(false);
      }

      // Live OpenAlex search (China-focused by default)
      try {
        const res = await fetch("/api/openalex-search?q=" + encodeURIComponent(value) + "&country=CN");
        if (res.ok) {
          const data = await res.json();
          setLive(data.results || []);
          setLiveError(null);
        } else {
          setLive([]);
          setLiveError("Live search failed");
        }
      } catch {
        setLive([]);
        setLiveError("Network error");
      } finally {
        setLoadingLive(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [q, retryKey]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const groupedStored = ["Professors", "Universities", "Programs", "Research", "Fields", "Disciplines", "Majors", "Related"]
    .map((heading) => ({
      heading,
      items: stored.filter((result) => (TYPE_LABEL[result.type] || "Results") === heading),
    }))
    .filter((group) => group.items.length > 0);

  const loading = loadingStored || loadingLive;
  const hasAny = stored.length > 0 || live.length > 0;

  return (
    <div className="relative max-w-2xl" ref={wrapRef}>
      <label htmlFor={boxId} className="sr-only">Search professors, research, universities, programs</label>
      <input
        id={boxId}
        className="input w-full py-3 text-base"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="What do you want to study or research?"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && (loading || hasAny || !!liveError)}
        aria-controls={`${boxId}-list`}
        aria-autocomplete="list"
      />
      {open && q.trim().length >= 2 && (
        <div id={`${boxId}-list`} role="listbox" className="menu-panel absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-[var(--gray-200)] bg-white shadow-lg max-h-[70vh] overflow-y-auto">
          {/* Stored results */}
          <div>
            <p className="bg-[var(--gray-50)] px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--gray-500)]">Stored records</p>
            {loadingStored && stored.length === 0 && <p className="px-4 py-3 text-sm text-[var(--gray-500)]">Searching stored records...</p>}
            {!loadingStored && stored.length === 0 && <p className="px-4 py-3 text-sm text-[var(--gray-500)]">Nothing stored matches that yet.</p>}
            {groupedStored.map((group) => (
              <div key={group.heading}>
                <p className="bg-[var(--gray-50)] px-4 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--gray-400)]">{group.heading}</p>
                {group.items.map((r) => (
                  <Link key={r.type + r.href + r.label} href={r.href} role="option" className="block border-b border-[var(--gray-100)] px-4 py-3 hover:bg-[var(--light-teal)]" onClick={() => setOpen(false)}>
                    <span className="block text-sm font-semibold text-[var(--navy)]">{r.label}</span>
                    <span className="block text-xs text-[var(--gray-500)]">{r.subtitle}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {/* Live OpenAlex results */}
          <div className="border-t border-[var(--gray-200)]">
            <p className="bg-[var(--teal)]/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--teal-dark)]">Live OpenAlex researchers (China)</p>
            {loadingLive && live.length === 0 && <p className="px-4 py-3 text-sm text-[var(--gray-500)]">Searching live researchers...</p>}
            {liveError && (
              <div className="px-4 py-3 text-sm">
                <p className="text-red-600">{liveError}. Results may be incomplete.</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-[var(--teal)] hover:underline"
                  onClick={() => setRetryKey((k) => k + 1)}
                >
                  Retry live search
                </button>
              </div>
            )}
            {!loadingLive && !liveError && live.length === 0 && (
              <p className="px-4 py-3 text-sm text-[var(--gray-500)]">No live researchers found for this query.</p>
            )}
            {live.map((r) => (
              <div key={r.openAlexId} className="border-b border-[var(--gray-100)] px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a href={r.profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--navy)] hover:text-[var(--teal)]">
                      {r.name}
                    </a>
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Unverified · Live</span>
                    {r.alreadyInDatabase && (
                      <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">Already in database</span>
                    )}
                  </div>
                </div>
                {r.affiliation && <p className="mt-0.5 text-xs text-[var(--gray-600)]">{r.affiliation}</p>}
                {r.topics.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--gray-500)]">Topics: {r.topics.slice(0, 4).join(", ")}</p>
                )}
                <a href={r.profileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-[var(--teal)] hover:underline">
                  OpenAlex profile
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
