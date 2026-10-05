"use client";

import { useState } from "react";

export default function MarkSeenButton() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const res = await fetch("/api/match-check", { method: "POST" });
    if (res.ok) setDone(true);
    else setError("Could not save the check.");
  }

  return (
    <div>
      <button type="button" onClick={save} className="btn-secondary text-sm" disabled={done}>{done ? "Check saved" : "Save this check"}</button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
