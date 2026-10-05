"use client";

import { useState } from "react";

type Reason = { tone: "ok" | "warn"; text: string };
type Result = { score: number; verdict: string; stored: Reason[]; needsSource: Reason[] };

export default function EligibilityButton({ kind, id }: { kind: "scholarship" | "program"; id: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function check() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not check eligibility");
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not check eligibility");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={check} disabled={loading} className="btn-secondary mt-3 text-xs">
        {loading ? "Checking..." : "Am I eligible?"}
      </button>
      {error && <p className="mt-2 text-xs text-amber-800">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-semibold text-[var(--navy)]">{result.verdict}</p>
          <p className="mt-1 text-xs text-gray-500">Profile fit {result.score}%. This is not an offer.</p>
          {result.stored.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.stored.map((reason) => (
                <li key={reason.text}>Stored — {reason.text}</li>
              ))}
            </ul>
          )}
          {result.needsSource.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.needsSource.map((reason) => (
                <li key={reason.text}>Needs an official source — {reason.text}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
