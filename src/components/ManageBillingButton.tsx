"use client";

import { useState } from "react";

export default function ManageBillingButton() {
  const [error, setError] = useState("");

  async function open() {
    setError("");
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setError(data.error || "Could not open the billing portal.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div>
      <button type="button" onClick={open} className="btn-secondary">Manage subscription</button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
