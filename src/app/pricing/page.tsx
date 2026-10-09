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
        description="Free is enough to explore. Pro removes monthly limits. Payment is handled by Stripe when configured. A successful payment is confirmed by webhook, not by this page alone."
        eyebrow="Pricing"
        actions={
          <Link href="/support" className="btn-secondary text-sm">
            Support & FAQ
          </Link>
        }
      />
      {cancelled && (
        <p className="mt-4 text-sm text-[var(--gray-700)]">Checkout was cancelled. Your plan was not changed.</p>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}{" "}
          <Link href="/support" className="font-semibold underline">
            Contact support
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="card p-5">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Free</h2>
          <p className="mt-2 text-3xl font-semibold text-[var(--navy)]">$0</p>
          <p className="mt-2 text-sm text-[var(--gray-700)]">Explore universities, professors, and a limited set of tools.</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--gray-600)]">
            <li>10 match searches / month</li>
            <li>2 active applications</li>
            <li>3 comparisons / month</li>
          </ul>
          <Link href="/onboarding" className="btn-secondary mt-5 w-full">
            Get started free
          </Link>
        </article>
        <article className="card border-[var(--teal)] p-5">
          <p className="text-xs font-medium text-[var(--teal-dark)]">Recommended</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--navy)]">Pro</h2>
          <p className="mt-2 text-3xl font-semibold text-[var(--navy)]">
            $9.99 <span className="text-base font-normal text-[var(--gray-500)]">/ month</span>
          </p>
          <p className="mt-2 text-sm text-[var(--gray-700)]">Unlimited matching, drafts, applications, and comparison.</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--gray-600)]">
            <li>Same stored catalog as Free</li>
            <li>No invented programs or deadlines</li>
            <li>Cancel anytime in Billing</li>
          </ul>
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

      <section className="mt-10 rounded-lg border border-[var(--gray-200)] bg-white p-5">
        <h2 className="font-semibold text-[var(--navy)]">What Pro does not change</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--gray-600)]">
          <li>Does not invent universities, professors, programs, or scholarships.</li>
          <li>Does not turn unverified deadline notes into official dates.</li>
          <li>Does not guarantee admission, funding, or supervisor replies.</li>
          <li>Apply for Me is a separate paid service with its own package fees.</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--gray-600)]">
          Questions about charges or limits?{" "}
          <Link href="/support" className="font-medium text-[var(--teal-dark)] hover:underline">
            Support
          </Link>
          {" · "}
          <Link href="/billing" className="font-medium text-[var(--teal-dark)] hover:underline">
            Billing
          </Link>
        </p>
      </section>
    </div>
  );
}
