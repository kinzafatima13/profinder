"use client";

import { useState } from "react";

export default function CheckoutButton({
  plan,
  label,
  className = "btn-primary",
}: {
  plan: "PRO_MONTHLY" | "PRO_ANNUAL";
  label: string;
  className?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || !data.url) {
      setError(data.error || "Checkout could not start.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div>
      <button type="button" className={className} onClick={start} disabled={busy}>{busy ? "Opening Stripe..." : label}</button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
