"use client";

import { useEffect, useState } from "react";

type Row = { id: string; email: string; name: string | null; plan: string };

export default function PaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/billing/review");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error === "Forbidden" ? "Admin only." : data.error);
      return;
    }
    setRows(data.pending);
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/billing/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) load();
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Payment review</h1>
      <p className="mt-1 text-sm text-gray-600">Approve only after the amount is in your JazzCash, EasyPaisa, or bank account.</p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{row.name || row.email}</p>
              <p className="text-sm text-gray-500">{row.plan}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={() => act(row.id, "approve")}>Confirm paid</button>
              <button className="btn-secondary text-sm" onClick={() => act(row.id, "reject")}>Reject</button>
            </div>
          </article>
        ))}
        {!error && rows.length === 0 && <p className="text-sm text-gray-500">No payments waiting.</p>}
      </div>
    </div>
  );
}
