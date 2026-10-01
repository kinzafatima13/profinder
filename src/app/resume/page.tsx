"use client";

import { useState } from "react";

type Row = { id: string; name: string; university: string; match: { score: number; explanation: string } };

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
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
    setMeta(`${data.shown} of ${data.total} matches shown on the ${data.plan} plan.`);
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Upload resume</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">Upload a PDF, DOCX, or TXT file. Text is extracted from the file. Free accounts see 3 professor matches.</p>
      <form onSubmit={submit} className="mt-6 max-w-xl space-y-3">
        <input className="input" type="file" accept=".pdf,.docx,.txt,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
        <button className="btn-primary" disabled={loading}>{loading ? "Reading file..." : "Upload and compare"}</button>
      </form>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {meta && <p className="mt-4 text-sm text-gray-500">{meta}</p>}
      {preview && <p className="mt-2 text-xs text-gray-500">Extracted text preview: {preview}</p>}
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="card p-4">
            <a className="font-semibold text-[var(--navy)]" href={`/professors/${row.id}`}>{row.name}</a>
            <p className="text-sm text-gray-500">{row.university} · {row.match.score}%</p>
            <p className="mt-1 text-sm">{row.match.explanation}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
