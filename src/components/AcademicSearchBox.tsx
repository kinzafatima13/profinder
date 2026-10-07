"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Result = { type: string; label: string; subtitle: string; href: string };

export default function AcademicSearchBox() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  useEffect(() => {
    const value = q.trim();
    if (value.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch("/api/academic-search?q=" + encodeURIComponent(value));
      if (res.ok) setResults((await res.json()).results || []);
    }, 180);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative max-w-2xl">
      <label htmlFor="academic-search" className="sr-only">Search majors and academic fields</label>
      <input id="academic-search" className="input w-full" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a major, field or discipline — e.g. biochemistry, finance, agriculture..." autoComplete="off" />
      {results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.map((r, i) => (
            <Link key={r.href + i} href={r.href} className="block border-b border-gray-100 px-4 py-3 hover:bg-gray-50" onClick={() => setQ(r.label)}>
              <span className="block text-sm font-semibold text-[var(--navy)]">{r.label}</span>
              <span className="block text-xs text-gray-500">{r.subtitle}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
