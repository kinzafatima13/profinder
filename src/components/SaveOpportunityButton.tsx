"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function SaveOpportunityButton({
  programId,
  scholarshipId,
  label = "Save",
}: {
  programId?: string;
  scholarshipId?: string;
  label?: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!session) {
      router.push("/login?callbackUrl=/tracker");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, scholarshipId, status: "Saved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setMsg(data.alreadyExists ? "Already saved" : "Saved");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={save} disabled={loading} className="btn-secondary text-xs">
        {loading ? "Saving..." : label}
      </button>
      {msg && (
        <p className="mt-1 text-xs text-gray-600">
          {msg}{" "}
          {msg === "Saved" || msg === "Already saved" ? (
            <Link href="/tracker" className="text-[var(--teal)] hover:underline">Open tracker</Link>
          ) : null}
        </p>
      )}
    </div>
  );
}
