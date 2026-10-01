"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SaveToTrackerButton({
  professorId,
}: {
  professorId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [msg, setMsg] = useState("");
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
        body: JSON.stringify({ professorId, status: "Saved" }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "PLAN_LIMIT") {
        setMsg(data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(data.alreadyExists ? "Already in your tracker" : "Saved to tracker");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSave}
        disabled={loading}
        className="btn-primary w-full text-sm"
      >
        {loading ? "Saving..." : "Save to Tracker"}
      </button>
      {msg && (
        <p className="mt-2 text-center text-xs text-gray-600">
          {msg}{" "}
          {msg.includes("Upgrade") && (
            <a href="/pricing" className="text-[var(--teal)] hover:underline">
              Pricing
            </a>
          )}
          {msg.includes("Saved") && (
            <a href="/tracker" className="text-[var(--teal)] hover:underline">
              Open tracker
            </a>
          )}
        </p>
      )}
    </div>
  );
}
