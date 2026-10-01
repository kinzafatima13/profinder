"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    setMessage("Password updated. You can log in.");
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold text-[var(--navy)]">Choose a new password</h1>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-emerald-800">{message}</p>}
      <input className="input" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn-primary w-full">Update password</button>
      <Link href="/login" className="block text-center text-sm text-[var(--teal)]">Log in</Link>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <Suspense fallback={<p>Loading...</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
