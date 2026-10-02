"use client";

import { useState } from "react";

type Row = {
  id: string;
  name: string;
  university: string;
  department?: string | null;
  interests?: string | null;
  match: {
    score: number;
    explanation: string;
    reasons?: string[];
    breakdown?: Record<string, number>;
  };
};

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/resume", { method: "POST", body });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Upload failed");
    setRows(data.results || []);
    setPreview(data.preview || "");
    setMeta(`${data.shown} of ${data.total} supervisor comparisons shown on the ${data.plan} plan.`);
    setSuggestions(data.suggestions || []);
  }

  return (
    <div className="page-container py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--teal)]">Supervisor fit</p>
      <h1 className="section-title mt-2">Compare your resume</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">Upload a PDF, DOCX, or TXT file. The text is compared with supervisor research. The resume file is not rewritten.</p>
      <form onSubmit={submit} className="mt-6 max-w-xl rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <input className="input" type="file" accept=".pdf,.docx,.txt,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
        <button className="btn-primary" disabled={loading}>{loading ? "Comparing..." : "Compare with supervisors"}</button>
      </form>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {meta && <p className="mt-4 text-sm text-gray-500">{meta}</p>}
      {preview && <p className="mt-2 max-w-3xl text-xs text-gray-500">Text used for comparison: {preview}</p>}
      {suggestions.length > 0 && (
        <section className="mt-6 max-w-3xl rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-[var(--navy)]">Ways to strengthen the resume</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
            {suggestions.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}
      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <a className="text-lg font-semibold text-[var(--navy)]" href={`/professors/${row.id}`}>{row.name}</a>
                <p className="text-sm text-gray-500">{row.university}{row.department ? ` · ${row.department}` : ""}</p>
              </div>
              <p className="text-2xl font-bold text-[var(--teal)]">{row.match.score}%</p>
            </div>
            <p className="mt-3 text-sm text-gray-700">{row.match.explanation}</p>
            {row.interests && <p className="mt-2 text-sm text-gray-500">Supervisor interests: {row.interests}</p>}
            {row.match.breakdown && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(row.match.breakdown).map(([key, value]) => (
                  <span key={key} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{key} {value}%</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
