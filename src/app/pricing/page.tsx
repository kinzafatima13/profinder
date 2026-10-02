"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const METHODS = [
  { id: "jazzcash", label: "JazzCash" },
  { id: "easypaisa", label: "EasyPaisa" },
  { id: "bank", label: "Bank transfer" },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [method, setMethod] = useState("jazzcash");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? "free";
  const isPro = plan === "pro";
  const pending = plan.startsWith("pending:");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/billing/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, reference }),
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
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--teal)]">Pro</p>
      <h1 className="section-title mt-2 text-center">Unlock ProFinder Pro</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-600">
        Choose a plan, then send the payment from JazzCash, EasyPaisa, or your bank. Pro starts only after the transfer is confirmed.
      </p>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4">
        <div className="rounded-2xl border-2 border-[var(--teal)] bg-emerald-50/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-800">Pro · monthly</p>
              <p className="mt-1 text-3xl font-bold text-[var(--navy)]">Rs 2,800 <span className="text-base font-normal text-gray-500">/ month</span></p>
              <p className="mt-2 text-sm text-gray-600">All matches, email drafts, and resume comparison.</p>
            </div>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-700 text-sm text-white">✓</span>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">Free</p>
          <p className="mt-1 text-3xl font-bold text-[var(--navy)]">Rs 0</p>
          <p className="mt-2 text-sm text-gray-600">3 supervisor matches and up to 5 saved applications.</p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment method</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {METHODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMethod(item.id)}
              className={`rounded-xl border px-2 py-3 text-sm font-medium ${method === item.id ? "border-[var(--navy)] bg-gray-50" : "border-gray-200 text-gray-600"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold text-[var(--navy)]">Send Rs 2,800 to this SadaPay account</p>
        <p className="mt-1 break-all font-mono text-sm">PK21SADA0000003262425671</p>
        {isPro && <p className="mt-4 text-sm font-semibold text-emerald-700">Pro is active.</p>}
        {pending && <p className="mt-4 text-sm text-amber-700">Payment is waiting for confirmation.</p>}
        {!session && <Link href="/login" className="btn-primary mt-4 inline-flex w-full justify-center">Log in to submit proof</Link>}
        {!isPro && !pending && session && (
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
