"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Could not create a code");
    setMessage(data.message);
    setDevCode(data.devCode || "");
    setStep(2);
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Reset failed");
    setMessage("Password updated. You can log in.");
  }

  return (
    <div className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-bold text-[var(--navy)]">Reset password</h1>
        <p className="text-sm text-gray-600">Enter your email, then the 6-digit code, then a new password.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-emerald-800">{message}</p>}
        {devCode && <p className="text-sm">Local verification code: <strong>{devCode}</strong></p>}
        {step === 1 ? (
          <form onSubmit={requestCode} className="space-y-3">
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <button className="btn-primary w-full">Send verification code</button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-3">
            <input className="input" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" />
            <input className="input" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
            <button className="btn-primary w-full">Reset password</button>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm text-[var(--teal)]">Back to login</Link>
      </div>
    </div>
  );
}
