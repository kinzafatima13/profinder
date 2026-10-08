"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

type Result = { type: string; label: string; subtitle: string; href: string };

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
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const value = q.trim();
    if (value.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/academic-search?q=" + encodeURIComponent(value));
        if (res.ok) setResults((await res.json()).results || []);
        else setResults([]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q]);

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

  const grouped = ["Professors", "Universities", "Programs", "Research", "Fields", "Disciplines", "Majors", "Related"]
    .map((heading) => ({
      heading,
      items: results.filter((result) => (TYPE_LABEL[result.type] || "Results") === heading),
    }))
    .filter((group) => group.items.length > 0);

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
        aria-expanded={open && (loading || results.length > 0)}
        aria-controls={`${boxId}-list`}
        aria-autocomplete="list"
      />
      {open && q.trim().length >= 2 && (
        <div id={`${boxId}-list`} role="listbox" className="menu-panel absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-[var(--gray-200)] bg-white shadow-lg">
          {loading && results.length === 0 && <p className="px-4 py-3 text-sm text-[var(--gray-500)]">Searching stored records...</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-sm text-[var(--gray-500)]">Nothing stored matches that yet.</p>}
          {grouped.map((group) => (
            <div key={group.heading}>
              <p className="bg-[var(--gray-50)] px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--gray-500)]">{group.heading}</p>
              {group.items.map((r) => (
                <Link key={r.type + r.href + r.label} href={r.href} role="option" className="block border-b border-[var(--gray-100)] px-4 py-3 hover:bg-[var(--light-teal)]" onClick={() => setOpen(false)}>
                  <span className="block text-sm font-semibold text-[var(--navy)]">{r.label}</span>
                  <span className="block text-xs text-[var(--gray-500)]">{r.subtitle}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
