"use client";

import { useMemo, useState } from "react";
import UniversityCard from "@/components/UniversityCard";

type University = {
  id: string;
  name: string;
  nameZh?: string | null;
  city?: string | null;
  province?: string | null;
  description?: string | null;
  agencyNumber?: string | null;
  professorCount?: number;
  programCount?: number;
};

export default function UniversityDiscovery({ universities }: { universities: University[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return universities;
    return universities.filter((university) =>
      [
        university.name,
        university.nameZh,
        university.city,
        university.province,
        university.description,
        university.agencyNumber,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(normalized)),
    );
  }, [query, universities]);

  return (
    <section className="mt-7" aria-label="University discovery">
      <div className="discovery-search-shell">
        <span className="discovery-search-icon" aria-hidden="true">⌕</span>
        <label htmlFor="university-search" className="sr-only">Search universities</label>
        <input
          id="university-search"
          type="search"
          className="input discovery-search-input"
          placeholder="Search by university, city, province, or agency number…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        {query && (
          <button type="button" className="discovery-clear" onClick={() => setQuery("")}>
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--gray-600)]" aria-live="polite">
          <strong className="text-[var(--navy)]">{filtered.length.toLocaleString()}</strong>{" "}
          {filtered.length === 1 ? "university" : "universities"} {query.trim() ? "match your search" : "in the directory"}
        </p>
        <span className="discovery-hint">Search updates instantly</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state mt-5 rounded-2xl border border-dashed border-[var(--gray-200)] bg-white px-6 py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-2xl text-violet-700" aria-hidden="true">⌕</div>
          <h2 className="mt-3 text-lg font-semibold text-[var(--navy)]">No universities found</h2>
          <p className="mt-1 text-sm text-[var(--gray-600)]">Try a different name, city, province, or agency number.</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => setQuery("")}>Clear search</button>
        </div>
      ) : (
        <div className="reveal-grid mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((university) => (
            <UniversityCard
              key={university.id}
              id={university.id}
              name={university.name}
              nameZh={university.nameZh}
              city={university.city}
              province={university.province}
              description={university.description}
              agencyNumber={university.agencyNumber}
              professorCount={university.professorCount}
              programCount={university.programCount}
            />
          ))}
        </div>
      )}
    </section>
  );
}
