"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { listSavedSearches, removeSavedSearch, searchHref, type SavedSearch } from "@/lib/saved-searches";

export default function SavedSearchesPage() {
  const [rows, setRows] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setRows(listSavedSearches());
  }, []);

  function onRemove(id: string) {
    setRows(removeSavedSearch(id));
  }

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Saved searches"
        description="Re-run Find My Match queries you saved on this device. Clearing browser data removes them."
        actions={
          <Link href="/find" className="btn-primary text-sm">
            New search
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-[var(--gray-200)] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[var(--navy)]">No saved searches yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-600)]">
            On Find My Match, run a search and use <strong>Save search</strong> to keep it here for later.
          </p>
          <Link href="/find" className="btn-primary mt-5 inline-flex text-sm">
            Find My Match
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-[var(--navy)]">{row.label || row.query}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--gray-600)]">{row.query}</p>
                <p className="mt-1 text-xs text-[var(--gray-500)]">
                  {[row.degree, row.country, row.funding, row.priority].filter(Boolean).join(" · ") || "No filters"}
                  {" · "}
                  {new Date(row.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={searchHref(row)} className="btn-primary text-sm">
                  Run again
                </Link>
                <button type="button" className="btn-secondary text-sm" onClick={() => onRemove(row.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
