"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const METHODS = [
  { id: "jazzcash", label: "JazzCash" },
  { id: "easypaisa", label: "EasyPaisa" },
  { id: "bank", label: "Bank transfer" },
];

const PLANS = [
  { id: "pro-monthly", name: "Pro · monthly", price: "Rs 2,800", period: "/ month", detail: "Start now. All matches, email drafts, and resume comparison.", amount: "Rs 2,800", badge: "" },
  { id: "pro-yearly", name: "Pro · yearly", price: "Rs 24,000", period: "/ year", detail: "Same Pro tools for 12 months. Rs 2,000 a month.", amount: "Rs 24,000", badge: "Save 29%" },
  { id: "premium-yearly", name: "Premium · yearly", price: "Rs 36,000", period: "/ year", detail: "The full year, with priority payment review. Rs 3,000 a month.", amount: "Rs 36,000", badge: "Best value" },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [method, setMethod] = useState("jazzcash");
  const [tier, setTier] = useState("pro-monthly");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? "free";
  const active = plan !== "free" && !plan.startsWith("pending:");
  const pending = plan.startsWith("pending:");
  const selected = PLANS.find((item) => item.id === tier) ?? PLANS[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/billing/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, reference, tier }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit payment");
      return;
    }
    setMessage(data.message);
  }

  return (
    <div className="page-container py-12">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--teal)]">Membership</p>
      <h1 className="section-title mt-2 text-center">Choose a ProFinder plan</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-600">Pick a plan, send the payment, then enter the transaction ID. It starts only after an admin confirms the transfer.</p>
      <div className="mx-auto mt-8 grid max-w-3xl gap-3">
        {PLANS.map((item) => (
          <button key={item.id} type="button" onClick={() => setTier(item.id)} className={`rounded-2xl border p-5 text-left ${tier === item.id ? "border-[var(--teal)] bg-emerald-50/50" : "border-gray-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">{item.name} {item.badge && <span className="ml-2 rounded-full bg-[var(--navy)] px-2 py-0.5 text-[10px] text-white">{item.badge}</span>}</p>
                <p className="mt-1 text-3xl font-bold text-[var(--navy)]">{item.price} <span className="text-base font-normal text-gray-500">{item.period}</span></p>
                <p className="mt-2 text-sm text-gray-600">{item.detail}</p>
              </div>
              <span className={`grid h-7 w-7 place-items-center rounded-full text-sm ${tier === item.id ? "bg-emerald-700 text-white" : "border border-gray-300 text-transparent"}`}>✓</span>
            </div>
          </button>
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment method</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {METHODS.map((item) => (
            <button key={item.id} type="button" onClick={() => setMethod(item.id)} className={`rounded-xl border px-2 py-3 text-sm font-medium ${method === item.id ? "border-[var(--navy)] bg-gray-50" : "border-gray-200 text-gray-600"}`}>{item.label}</button>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold text-[var(--navy)]">Send {selected.amount} to this SadaPay account</p>
        <p className="mt-1 break-all font-mono text-sm">PK21SADA0000003262425671</p>
        {active && <p className="mt-4 text-sm font-semibold text-emerald-700">This account is active: {plan}.</p>}
        {pending && <p className="mt-4 text-sm text-amber-700">Payment is waiting for confirmation.</p>}
        {!session && <Link href="/login" className="btn-primary mt-4 inline-flex w-full justify-center">Log in to submit proof</Link>}
        {!active && !pending && session && (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID" required />
            <button className="btn-primary w-full">Submit payment proof</button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-3 text-sm text-emerald-800">{message}</p>}
        <p className="mt-3 text-center text-xs text-gray-500">Card checkout is not available for this Pakistan account.</p>
      </div>
    </div>
  );
}
