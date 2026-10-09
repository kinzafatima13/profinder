"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

type Hit = { id: string; name: string; detail: string };

export default function ComparePage() {
  const [kind, setKind] = useState<"professor" | "university">("professor");
  const [leftQuery, setLeftQuery] = useState("");
  const [rightQuery, setRightQuery] = useState("");
  const [leftHits, setLeftHits] = useState<Hit[]>([]);
  const [rightHits, setRightHits] = useState<Hit[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [result, setResult] = useState<{ kind: string; left: Record<string, unknown>; right: Record<string, unknown> } | null>(null);
  const [error, setError] = useState("");

  async function search(side: "left" | "right", query: string) {
    const path = kind === "university" ? "/api/universities" : "/api/professors";
    const res = await fetch(`${path}?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const hits: Hit[] =
      kind === "university"
        ? (data.universities || []).slice(0, 6).map((item: { id: string; name: string; city?: string | null }) => ({
            id: item.id,
            name: item.name,
            detail: item.city || "China",
          }))
        : (data.professors || []).slice(0, 6).map((item: { id: string; name: string; universityName?: string }) => ({
            id: item.id,
            name: item.name,
            detail: item.universityName || "",
          }));
    if (side === "left") setLeftHits(hits);
    else setRightHits(hits);
  }

  async function compare() {
    setError("");
    setResult(null);
    const res = await fetch(`/api/compare?kind=${kind}&a=${encodeURIComponent(leftId)}&b=${encodeURIComponent(rightId)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not compare");
      return;
    }
    setResult(data);
  }

  const rows = result ? Object.keys(result.left).filter((key) => key !== "id") : [];

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Compare"
        description="Side-by-side facts already stored. University funding shows scholarship labels and counts only. Coverage amounts and official deadlines are not stored, so they are not compared."
      />
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={kind === "professor" ? "btn-primary text-sm" : "btn-secondary text-sm"}
          onClick={() => {
            setKind("professor");
            setResult(null);
          }}
        >
          Professors
        </button>
        <button
          type="button"
          className={kind === "university" ? "btn-primary text-sm" : "btn-secondary text-sm"}
          onClick={() => {
            setKind("university");
            setResult(null);
          }}
        >
          Universities
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          { side: "left" as const, query: leftQuery, setQuery: setLeftQuery, hits: leftHits, id: leftId, setId: setLeftId },
          { side: "right" as const, query: rightQuery, setQuery: setRightQuery, hits: rightHits, id: rightId, setId: setRightId },
        ].map((box) => (
          <div key={box.side} className="card p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                search(box.side, box.query);
              }}
            >
              <input
                className="input"
                value={box.query}
                onChange={(event) => box.setQuery(event.target.value)}
                placeholder={kind === "university" ? "University name" : "Professor name"}
              />
              <button className="btn-secondary mt-2 text-sm" type="submit">
                Search
              </button>
            </form>
            <ul className="mt-3 space-y-2 text-sm">
              {box.hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className={box.id === hit.id ? "is-selected px-1 font-semibold text-[var(--teal-dark)]" : "px-1 text-[var(--navy)]"}
                    onClick={() => box.setId(hit.id)}
                  >
                    {hit.name}
                  </button>
                  <span className="text-[var(--gray-500)]"> · {hit.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button type="button" className="btn-primary mt-4" onClick={compare} disabled={!leftId || !rightId}>
        Compare selected
      </button>
      {error && <p className="mt-3 text-sm text-amber-800">{error}</p>}
      {result && (
        <div className="compare-stage mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-200)] text-[var(--gray-500)]">
                <th className="py-2 pr-4">Fact</th>
                <th className="py-2 pr-4">{String(result.left.name)}</th>
                <th className="py-2">{String(result.right.name)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((key) => (
                <tr key={key} className="border-b border-[var(--gray-100)]">
                  <td className="py-2 pr-4 text-[var(--gray-500)]">{key}</td>
                  <td className="py-2 pr-4">{formatFact(result.left[key])}</td>
                  <td className="py-2">{formatFact(result.right[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-[var(--gray-500)]">
            Open a record:{" "}
            <Link
              className="font-medium text-[var(--teal-dark)] hover:underline"
              href={result.kind === "university" ? `/universities/${String(result.left.id)}` : `/professors/${String(result.left.id)}`}
            >
              left
            </Link>
            {" · "}
            <Link
              className="font-medium text-[var(--teal-dark)] hover:underline"
              href={result.kind === "university" ? `/universities/${String(result.right.id)}` : `/professors/${String(result.right.id)}`}
            >
              right
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function formatFact(value: unknown) {
  if (value == null || value === "") return "Not stored";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not stored";
  return String(value);
}
