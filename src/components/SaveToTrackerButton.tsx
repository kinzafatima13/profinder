"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const STATUSES = ["Saved", "Researching", "Contacted", "Follow-up"];

export default function SaveToTrackerButton({
  professorId,
}: {
  professorId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState("Saved");
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!session) {
      router.push(`/login?callbackUrl=/professors/${professorId}`);
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorId, status }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "PLAN_LIMIT") {
        setMsg(data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed");
      setSaved(true);
      setMsg(data.alreadyExists ? "Already in your tracker" : "Saved to tracker");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500" htmlFor={`save-status-${professorId}`}>
        Save as
      </label>
      <select
        id={`save-status-${professorId}`}
        className="input w-full py-1.5 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {STATUSES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <button onClick={handleSave} disabled={loading} className="btn-primary w-full text-sm">
        {loading ? "Saving..." : "Save to Tracker"}
      </button>
      {msg && (
        <p className="text-center text-xs text-gray-600">
          {msg}{" "}
          {msg.includes("Upgrade") && (
            <Link href="/pricing" className="text-[var(--teal)] hover:underline">Pricing</Link>
          )}
          {saved && (
            <Link href="/tracker" className="text-[var(--teal)] hover:underline">Open tracker</Link>
          )}
        </p>
      )}
    </div>
  );
}
