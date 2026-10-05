"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const STATUSES = [
  "Saved",
  "Researching",
  "Contacted",
  "Follow-up",
  "Replied",
  "Interested",
  "Application Started",
  "Application Submitted",
  "Accepted",
  "Rejected",
];

type AppRow = {
  id: string;
  status: string;
  notes: string | null;
  deadline: string | null;
  followUpDate: string | null;
  scholarship: string | null;
  applicationUrl: string | null;
  professor: {
    id: string;
    name: string;
    university: { name: string; city: string | null; agencyNumber: string | null };
  } | null;
};

function nextAction(status: string) {
  if (status === "Saved" || status === "Researching") return "Open the professor page, confirm the faculty source, then draft the email.";
  if (status === "Contacted" || status === "Follow-up") return "Do not send another email until the follow-up date. Record any reply here.";
  if (status === "Replied" || status === "Interested") return "Save what they asked for, then start the application documents.";
  if (status === "Application Started") return "Finish the documents and record the submission link.";
  if (status === "Application Submitted") return "Watch the deadline note and wait for a decision.";
  if (status === "Accepted" || status === "Rejected") return "This one is closed. Keep the outcome in the notes.";
  return "Update the status when something changes.";
}

export default function TrackerPage() {
  const { data: session, status: authStatus } = useSession();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
        <h1 className="section-title">Application Tracker</h1>
        <p className="mt-2 text-gray-600">
          Log in to save professors and track your applications.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login?callbackUrl=/tracker" className="btn-primary">
            Log in
          </Link>
          <Link href="/signup" className="btn-secondary">
            Sign up free
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">Application Tracker</h1>
          <p className="mt-1 text-gray-600">
            {apps.length} tracked · Plan:{" "}
            <span className="font-medium capitalize">{plan === "pro" ? "Pro" : plan === "free" ? "Free" : "Upgrade pending"}</span>
            {plan === "free" && (
              <Link href="/pricing" className="ml-2 text-[var(--teal)] hover:underline">
                Upgrade for unlimited
              </Link>
            )}
          </p>
        </div>
        <Link href="/find" className="btn-primary text-sm">
          Find professors
        </Link>
      </div>
      {apps.length > 0 && (
        <p className="mt-3 text-sm text-gray-600">
          {apps.filter((row) => ["Contacted", "Follow-up", "Replied", "Interested", "Application Started", "Application Submitted", "Accepted"].includes(row.status)).length} of {apps.length} have moved past saved.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {apps.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">No applications tracked yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Open a professor profile and click &quot;Save to Tracker&quot;.
          </p>
          <Link href="/professors" className="btn-primary mt-4 inline-flex">
            Browse professors
          </Link>
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
                  <p className="font-medium text-[var(--navy)]">{row.professor?.university.name ?? "University not linked"}</p>
                  {row.professor ? (
                    <Link href={`/professors/${row.professor.id}`} className="text-[var(--teal)] hover:underline">
                      {row.professor.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-500">Professor not linked</p>
                  )}
                  <p className="mt-2 text-sm text-gray-700">Next: {nextAction(row.status)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <select className="input w-full py-1.5 sm:w-52" value={row.status} onChange={(e) => updateStatus(row.id, e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="text-left text-xs text-red-600 hover:underline sm:text-right" onClick={() => remove(row.id)}>Remove</button>
                </div>
              </div>
              <form
                className="mt-4 grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  saveDetails(row.id, {
                    notes: String(form.get("notes") || ""),
                    deadline: String(form.get("deadline") || ""),
                    followUpDate: String(form.get("followUpDate") || ""),
                    scholarship: String(form.get("scholarship") || ""),
                    applicationUrl: String(form.get("applicationUrl") || ""),
                  });
                }}
              >
                <input className="input" name="deadline" defaultValue={row.deadline ?? ""} placeholder="Deadline" />
                <input className="input" name="followUpDate" defaultValue={row.followUpDate ?? ""} placeholder="Follow-up date" />
                <input className="input" name="scholarship" defaultValue={row.scholarship ?? ""} placeholder="Scholarship" />
                <input className="input" name="applicationUrl" defaultValue={row.applicationUrl ?? ""} placeholder="Application link" />
                <textarea className="input min-h-20 sm:col-span-2" name="notes" defaultValue={row.notes ?? ""} placeholder="Notes" />
                <button className="btn-secondary w-full sm:col-span-2 sm:w-auto" type="submit">Save details</button>
              </form>
            </article>
          ))}
        </div>
        </>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-bold text-[var(--navy)]">CSC workspace</h2>
        <p className="mt-2 text-sm text-gray-600">Agency numbers already stored for the universities in this tracker. Confirm each code on the official CSC notice before applying.</p>
        <div className="mt-4 space-y-2">
          {apps.length === 0 ? <p className="text-sm text-gray-500">Save a professor to see the university agency number here.</p> : apps.map((row) => (
            <p key={row.id} className="text-sm text-gray-700">{row.professor?.university.name ?? "University not linked"} · {row.professor?.university.agencyNumber ? `Agency ${row.professor.university.agencyNumber}` : "Agency number not recorded"}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
