"use client";

import { useEffect, useState } from "react";

type Uni = { id: string; name: string };
type Sch = {
  id: string;
  name: string;
  type: string | null;
  deadline: string | null;
  advantages: string | null;
  requirements: string | null;
  officialUrl: string | null;
  dataStatus: string | null;
  university: { name: string } | null;
};

export default function ScholarshipPage() {
  const [rows, setRows] = useState<Sch[]>([]);
  const [unis, setUnis] = useState<Uni[]>([]);
  const [universityId, setUniversityId] = useState("");
  const [type, setType] = useState("");

  async function load(nextUni = universityId, nextType = type) {
    const q = new URLSearchParams();
    if (nextUni) q.set("universityId", nextUni);
    if (nextType) q.set("type", nextType);
    const res = await fetch(`/api/scholarships?${q.toString()}`);
    const data = await res.json();
    setRows(data.scholarships || []);
    setUnis(data.universities || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Scholarships</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">CSC, university, and presidential awards currently stored. Dates are unverified until checked against the official page.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <select className="input max-w-xs" value={universityId} onChange={(e) => { setUniversityId(e.target.value); load(e.target.value, type); }}>
          <option value="">All universities</option>
          {unis.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="input max-w-xs" value={type} onChange={(e) => { setType(e.target.value); load(universityId, e.target.value); }}>
          <option value="">All types</option>
          <option value="CSC">CSC</option>
          <option value="University">University</option>
          <option value="Presidential">Presidential</option>
        </select>
      </div>
      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <article key={row.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-[var(--navy)]">{row.name}</h2>
              <span className="badge-teal">{row.type}</span>
            </div>
            <p className="text-sm text-gray-500">{row.university?.name} · {row.dataStatus || "unverified"}</p>
            <p className="mt-2 text-sm">Apply window: {row.deadline || "Not available"}</p>
            <p className="mt-1 text-sm text-gray-700">{row.advantages || "Advantages not listed"}</p>
            <p className="mt-1 text-sm text-gray-500">{row.requirements}</p>
            {row.officialUrl && <a className="mt-2 inline-block text-sm text-[var(--teal)]" href={row.officialUrl} target="_blank" rel="noreferrer">Official source</a>}
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-500">No scholarships match that filter.</p>}
      </div>
    </div>
  );
}
