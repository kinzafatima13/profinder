"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";

const rows = [
  ["Browse universities and professors", "Yes", "Yes"],
  ["Professor match searches", "10 / month", "Unlimited"],
  ["Outreach drafts", "3 / month", "Unlimited"],
  ["Active applications", "2", "Unlimited"],
  ["Comparisons", "3 / month", "Unlimited"],
  ["Saved data after downgrade", "Kept", "Kept"],
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const cancelled =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "cancelled";

  async function start(plan: "PRO_MONTHLY" | "PRO_ANNUAL") {
    if (!session) {
      window.location.href = "/login?callbackUrl=/pricing";
      return;
    }
    setBusy(plan);
    setError("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok || !data.url) {
      setError(data.error || "Checkout could not start.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="page-container py-8">
      <PageHeader
        title="ProFinder Free, or ProFinder Pro"
        description="Free is enough to explore. Pro removes the monthly limits. Payment is handled by Stripe. A successful payment is confirmed by webhook, not by this page."
        eyebrow="Pricing"
      />
      {cancelled && (
        <p className="mt-4 text-sm text-[var(--gray-700)]">Checkout was cancelled. Your plan was not changed.</p>
      )}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="card p-5">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Free</h2>
          <p className="mt-2 text-3xl font-semibold text-[var(--navy)]">$0</p>
          <p className="mt-2 text-sm text-[var(--gray-700)]">Explore universities, professors, and a limited set of tools.</p>
          <Link href="/universities" className="btn-secondary mt-5 w-full">
            Start exploring
          </Link>
        </article>
        <article className="card border-[var(--teal)] p-5">
          <p className="text-xs font-medium text-[var(--teal-dark)]">Recommended</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--navy)]">Pro</h2>
          <p className="mt-2 text-3xl font-semibold text-[var(--navy)]">
            $9.99 <span className="text-base font-normal text-[var(--gray-500)]">/ month</span>
          </p>
          <p className="mt-2 text-sm text-[var(--gray-700)]">Unlimited matching, drafts, applications, and comparison.</p>
          <button
            className="btn-primary mt-5 w-full"
            disabled={busy === "PRO_MONTHLY"}
            onClick={() => start("PRO_MONTHLY")}
          >
            {busy === "PRO_MONTHLY" ? "Opening Stripe…" : "Start Pro"}
          </button>
        </article>
        <article className="card p-5">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Pro annual</h2>
          <p className="mt-2 text-3xl font-semibold text-[var(--navy)]">
            $89.99 <span className="text-base font-normal text-[var(--gray-500)]">/ year</span>
          </p>
          <p className="mt-2 text-sm text-[var(--gray-700)]">Same Pro access. Save about 25% versus paying monthly.</p>
          <button
            className="btn-secondary mt-5 w-full"
            disabled={busy === "PRO_ANNUAL"}
            onClick={() => start("PRO_ANNUAL")}
          >
            {busy === "PRO_ANNUAL" ? "Opening Stripe…" : "Get Pro annual"}
          </button>
        </article>
      </div>
      <table className="mt-10 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--gray-200)] text-[var(--gray-500)]">
            <th className="py-2 font-medium">Feature</th>
            <th className="py-2 font-medium">Free</th>
            <th className="py-2 font-medium">Pro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-[var(--gray-200)]">
              <td className="py-2">{row[0]}</td>
              <td className="py-2">{row[1]}</td>
              <td className="py-2">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
