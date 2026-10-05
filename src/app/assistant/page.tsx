"use client";

import { useState } from "react";
import Link from "next/link";

type Source = { label: string; href: string };

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not answer");
      return;
    }
    setAnswer(data.answer || "");
    setSources(data.sources || []);
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Application assistant</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Ask about your saved professors, scholarships, documents, and deadlines. Answers come from your tracker and profile. They do not search the web.
      </p>
      <form onSubmit={ask} className="mt-6 max-w-2xl space-y-3">
        <textarea className="input min-h-[100px]" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: What is missing on my saved applications?" required />
        <button className="btn-primary" disabled={loading}>{loading ? "Checking..." : "Ask"}</button>
      </form>
      {error && <p className="mt-4 text-sm text-red-700">{error} {error.toLowerCase().includes("sign in") && <Link className="text-[var(--teal)]" href="/login?callbackUrl=/assistant">Sign in</Link>}</p>}
      {answer && <p className="mt-6 max-w-2xl text-sm text-gray-800">{answer}</p>}
      {sources.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {sources.map((source) => (
            <li key={source.href + source.label}><Link className="text-[var(--teal)]" href={source.href}>{source.label}</Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
