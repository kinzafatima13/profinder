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
  professor: {
    id: string;
    name: string;
    university: { name: string; city: string | null };
  } | null;
};

export default function TrackerPage() {
  const { data: session, status: authStatus } = useSession();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            <span className="font-medium capitalize">{plan}</span>
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
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 pr-4 font-medium">University</th>
                <th className="pb-3 pr-4 font-medium">Professor</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-medium text-[var(--navy)]">
                    {row.professor?.university.name ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {row.professor ? (
                      <Link
                        href={`/professors/${row.professor.id}`}
                        className="text-[var(--teal)] hover:underline"
                      >
                        {row.professor.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      className="input max-w-[180px] py-1.5"
                      value={row.status}
                      onChange={(e) => updateStatus(row.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => remove(row.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-bold text-[var(--navy)]">CSC workspace</h2>
        <p className="mt-2 text-sm text-gray-600">
          Track agency numbers, documents, and deadlines alongside professor
          outreach — expand this section as you grow the China CSC workflow.
        </p>
      </section>
    </div>
  );
}
