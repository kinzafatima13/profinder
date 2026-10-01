"use client";

import { useEffect, useState } from "react";

type Row = { id: string; name: string; university: string; dataStatus: string };

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/professors");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error === "Forbidden" ? "Admin access only." : data.error);
      return;
    }
    setRows(data.professors);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, dataStatus: string) {
    const res = await fetch("/api/admin/professors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dataStatus }),
    });
    if (res.ok) load();
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Data review</h1>
      <p className="mt-1 text-sm text-gray-600">Server-checked admin view. Set ADMIN_EMAILS or role=admin.</p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-[var(--navy)]">{row.name}</p>
              <p className="text-sm text-gray-500">{row.university}</p>
            </div>
            <select className="input max-w-xs" value={row.dataStatus} onChange={(e) => setStatus(row.id, e.target.value)}>
              <option value="unverified">Unverified</option>
              <option value="needs_review">Needs review</option>
              <option value="verified">Verified</option>
              <option value="outdated">Outdated</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
