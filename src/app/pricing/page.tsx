"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

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
      <h1 className="section-title text-center">Pricing</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-600">
        Stripe is not available for Pakistan merchant accounts. Pay by JazzCash, EasyPaisa, or bank transfer. Pro is activated only after the payment is confirmed.
      </p>
      <div className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="mt-2 text-3xl font-bold">$0</p>
          <p className="mt-3 text-sm text-gray-600">3 supervisor matches and up to 5 saved applications.</p>
        </div>
        <div className="card border-2 border-[var(--teal)] p-6">
          <h2 className="text-xl font-bold">Pro</h2>
          <p className="mt-2 text-3xl font-bold">Rs 2,800<span className="text-base font-normal text-gray-500"> / month</span></p>
          <p className="mt-3 text-sm text-gray-600">All available matches, email drafts, and resume comparison.</p>
          {isPro && <p className="mt-4 text-sm font-semibold text-emerald-700">Pro is active.</p>}
          {pending && <p className="mt-4 text-sm text-amber-700">Payment is waiting for confirmation.</p>}
          {!isPro && !pending && session && (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="bank">Bank transfer</option>
              </select>
              <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID" required />
              <button className="btn-primary w-full">Submit payment proof</button>
            </form>
          )}
          {!session && <Link href="/login" className="btn-secondary mt-4 inline-flex">Log in to pay</Link>}
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          {message && <p className="mt-3 text-sm text-emerald-800">{message}</p>}
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-lg rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p className="font-semibold text-[var(--navy)]">Send Rs 2,800 to this SadaPay account</p>
        <p className="mt-2 break-all font-mono">PK21SADA0000003262425671</p>
        <p className="mt-2 text-xs text-gray-500">After the transfer, enter the transaction ID above. Pro starts only after the payment is confirmed in this account.</p>
      </div>
    </div>
  );
}
