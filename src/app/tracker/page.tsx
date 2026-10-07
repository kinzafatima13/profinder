"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { applicationPlan, parseDocuments, readinessScore, COMMON_DOCUMENTS, OPTIONAL_DOCUMENTS } from "@/lib/application-plan";

const OUTREACH = ["Drafted", "Sent", "Waiting", "Replied", "Interested", "Rejected"];

const STATUSES = [
  "Saved",
  "Researching",
  "Drafted",
  "Sent",
  "Waiting",
  "Contacted",
  "Follow-up",
  "Replied",
  "Interested",
  "Supervisor Interested",
  "Application Started",
  "Application Submitted",
  "Interview",
  "Offer",
  "Accepted",
  "Rejected",
  "Withdrawn",
];

function outreachStage(status: string) {
  if (status === "Saved" || status === "Researching" || status === "Drafted") return "Drafted";
  if (status === "Contacted" || status === "Sent") return "Sent";
  if (status === "Follow-up" || status === "Waiting") return "Waiting";
  if (status === "Accepted" || status === "Offer" || status === "Supervisor Interested") return "Interested";
  return OUTREACH.includes(status) ? status : "Drafted";
}

type AppRow = {
  id: string;
  status: string;
  notes: string | null;
  deadline: string | null;
  followUpDate: string | null;
  scholarship: string | null;
  programName: string | null;
  documentsJson: string | null;
  applicationUrl: string | null;
  professor: {
    id: string;
    name: string;
    email: string | null;
    dataStatus: string;
    university: { name: string; city: string | null; agencyNumber: string | null };
  } | null;
};

export default function TrackerPage() {
  const { data: session, status: authStatus } = useSession();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [hasProfile, setHasProfile] = useState(false);
  const [hasEnglish, setHasEnglish] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/applications");
      if (res.status === 401) {
        setApps([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setApps(data.applications ?? []);
      setPlan(data.plan ?? "free");
      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setHasProfile(Boolean(profileData.profile?.degree && profileData.profile?.researchInterests));
        setHasEnglish(Boolean(profileData.profile?.englishTest?.trim()));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") load();
    if (authStatus === "unauthenticated") setLoading(false);
  }, [authStatus, load]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
  }

  async function saveDetails(id: string, details: { notes: string; deadline: string; followUpDate: string; scholarship: string; applicationUrl: string }) {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...details }),
    });
    if (!res.ok) setError("Could not save tracker details.");
  }

  async function toggleDocument(row: AppRow, name: string) {
    const documents = parseDocuments(row.documentsJson);
    documents[name] = documents[name] === "done" ? "missing" : "done";
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, documentsJson: JSON.stringify(documents) }),
    });
    if (res.ok) load();
    else setError("Could not update the document checklist.");
  }

  function planFor(row: AppRow) {
    return applicationPlan({
      hasProfile,
      hasEnglish,
      hasTarget: Boolean(row.professor || row.programName || row.scholarship),
      status: row.status,
      documents: parseDocuments(row.documentsJson),
    });
  }

  function scoreFor(row: AppRow) {
    return readinessScore({
      hasProfile,
      hasEnglish,
      hasTarget: Boolean(row.professor || row.programName || row.scholarship),
      verifiedProfessor: row.professor?.dataStatus === "verified",
      hasEmail: Boolean(row.professor?.email?.trim()),
      documents: parseDocuments(row.documentsJson),
    });
  }

  async function remove(id: string) {
    if (!confirm("Remove this application from your tracker?")) return;
    const res = await fetch(`/api/applications?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="page-container py-10">
        <p className="text-gray-500">Loading tracker...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-container py-16 text-center">
        <h1 className="section-title">Applications</h1>
        <p className="mt-2 text-gray-600">Log in to track programs, scholarships, and supervisors.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login?callbackUrl=/tracker" className="btn-primary">Log in</Link>
          <Link href="/signup" className="btn-secondary">Sign up free</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">Applications</h1>
          <p className="mt-1 text-gray-600">
            {apps.length} tracked · Plan: <span className="font-medium capitalize">{plan === "pro" ? "Pro" : plan === "free" ? "Free" : "Upgrade pending"}</span>
            {plan === "free" && <Link href="/pricing" className="ml-2 text-[var(--teal)] hover:underline">Upgrade for unlimited</Link>}
          </p>
        </div>
        <Link href="/search" className="btn-primary text-sm">Search opportunities</Link>
      </div>
      {apps.length > 0 && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <article className="card p-4">
            <p className="text-xs text-gray-500">Readiness</p>
            <p className="text-3xl font-bold text-[var(--navy)]">{Math.round(apps.reduce((sum, row) => sum + scoreFor(row).score, 0) / apps.length)}%</p>
          </article>
          <article className="card p-4 sm:col-span-2">
            <p className="text-xs text-gray-500">Next</p>
            <p className="mt-1 text-sm text-gray-800">{planFor(apps[0]).next}</p>
          </article>
        </section>
      )}
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {apps.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nothing is tracked yet.</p>
          <p className="mt-1 text-sm text-gray-400">Save a program, scholarship, or supervisor. A supervisor is optional.</p>
          <Link href="/search" className="btn-primary mt-4 inline-flex">Search opportunities</Link>
        </div>
      ) : (
        <>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {["All", ...STATUSES].map((status) => {
            const count = status === "All" ? apps.length : apps.filter((row) => row.status === status).length;
            if (status !== "All" && !count) return null;
            const active = statusFilter === status;
            return (
              <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`shrink-0 rounded-full px-3 py-1 text-xs shadow-sm ${active ? "bg-[var(--navy)] text-white" : "bg-white text-gray-600"}`}>
                {status} · {count}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-4">
          {apps.filter((row) => statusFilter === "All" || row.status === statusFilter).map((row) => (
            <article key={row.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--navy)]">{row.professor?.university.name ?? row.programName ?? row.scholarship ?? "Saved item"}</p>
                  {row.professor ? (
                    <Link href={`/professors/${row.professor.id}`} className="text-[var(--teal)] hover:underline">{row.professor.name}</Link>
                  ) : (
                    <p className="text-sm text-gray-500">{row.programName || row.scholarship || "No supervisor linked"}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-700">Next: {planFor(row).next}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--navy)]">Readiness {scoreFor(row).score}%</p>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500">Common materials. Not required for every discipline.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {COMMON_DOCUMENTS.map((name) => {
                        const done = parseDocuments(row.documentsJson)[name] === "done";
                        return (
                          <button key={name} type="button" onClick={() => toggleDocument(row, name)} className={`rounded-full px-2 py-1 text-xs ${done ? "bg-[var(--light-teal)] text-[var(--teal-dark)]" : "bg-gray-100 text-gray-600"}`}>
                            {done ? "Uploaded" : "Missing"} · {name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-gray-500">Optional</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {OPTIONAL_DOCUMENTS.map((name) => {
                        const done = parseDocuments(row.documentsJson)[name] === "done";
                        return (
                          <button key={name} type="button" onClick={() => toggleDocument(row, name)} className={`rounded-full px-2 py-1 text-xs ${done ? "bg-[var(--light-teal)] text-[var(--teal-dark)]" : "bg-gray-100 text-gray-600"}`}>
                            {done ? "Uploaded" : "Optional"} · {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {OUTREACH.map((stage) => (
                      <button key={stage} type="button" onClick={() => updateStatus(row.id, stage)} className={`rounded-full px-2 py-1 text-xs ${outreachStage(row.status) === stage ? "bg-[var(--navy)] text-white" : "bg-gray-100 text-gray-600"}`}>
                        {stage}
                      </button>
                    ))}
                  </div>
                  <select className="input w-full py-1.5 sm:w-52" value={STATUSES.includes(row.status) ? row.status : "Saved"} onChange={(e) => updateStatus(row.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="text-left text-xs text-red-600 hover:underline sm:text-right" onClick={() => remove(row.id)}>Remove</button>
                </div>
              </div>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                saveDetails(row.id, {
                  notes: String(form.get("notes") || ""),
                  deadline: String(form.get("deadline") || ""),
                  followUpDate: String(form.get("followUpDate") || ""),
                  scholarship: String(form.get("scholarship") || ""),
                  applicationUrl: String(form.get("applicationUrl") || ""),
                });
              }}>
                <input className="input" name="deadline" defaultValue={row.deadline ?? ""} placeholder="Deadline, if you confirmed it" />
                <input className="input" name="followUpDate" defaultValue={row.followUpDate ?? ""} placeholder="Follow-up date" />
                <input className="input" name="scholarship" defaultValue={row.scholarship ?? ""} placeholder="Scholarship" />
                <input className="input" name="applicationUrl" defaultValue={row.applicationUrl ?? ""} placeholder="Official application link" />
                <textarea className="input min-h-20 sm:col-span-2" name="notes" defaultValue={row.notes ?? ""} placeholder="Notes" />
                <button className="btn-secondary w-full sm:col-span-2 sm:w-auto" type="submit">Save details</button>
              </form>
            </article>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
