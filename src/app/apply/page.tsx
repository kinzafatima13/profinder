"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type University = { id: string; name: string; city: string | null; country?: string | null };
type Item = { id: string; status: string; preparationNote: string | null; university: University };
type Doc = { id: string; kind: string; name: string; size: number };
type RequestRow = { id: string; status: string; paymentStatus: string; feeCents: number; items: Item[]; documents: Doc[] };

const STEPS = ["Choose", "Upload", "Pay", "Prepare", "Review", "Approve", "Submit", "Track"];

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<University[]>([]);
  const [chosen, setChosen] = useState<University[]>([]);
  const [packageId, setPackageId] = useState<"intro" | "set" | "custom">("intro");
  const [customCount, setCustomCount] = useState(6);
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [active, setActive] = useState<string>("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/apply");
    if (!res.ok) return;
    const data = await res.json();
    setRequests(data.requests || []);
  }

  useEffect(() => {
    if (status === "authenticated") load();
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("request");
    const sessionId = params.get("session_id");
    if (requestId) setActive(requestId);
    if (requestId && sessionId) {
      fetch(`/api/apply/${requestId}/checkout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then(() => load());
    }
  }, [status]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const res = await fetch(`/api/universities?q=${encodeURIComponent(query)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setHits([]);
      setMessage(data.error || "University search failed.");
      return;
    }
    const rows = (data.universities || []).slice(0, 8);
    setHits(rows);
    if (!rows.length) setMessage("No stored university matched that name.");
  }

  function limit() {
    if (packageId === "intro") return 3;
    if (packageId === "set") return 5;
    return Math.min(12, Math.max(6, customCount || 6));
  }

  function addUniversity(university: University) {
    setMessage("");
    setChosen((current) => {
      if (current.some((row) => row.id === university.id)) return current;
      if (current.length >= limit()) {
        setMessage(`This package takes ${limit()} universities. Remove one to change the selection.`);
        return current;
      }
      return [...current, university];
    });
  }

  async function createRequest() {
    if (chosen.length !== limit()) {
      setMessage(`Select ${limit()} stored universities, then send the request. ${chosen.length} selected.`);
      return;
    }
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ universityIds: chosen.map((row) => row.id), studentNote: note, packageId, customCount }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Could not send the request.");
      return;
    }
    setActive(data.request.id);
    setChosen([]);
    setNote("");
    setMessage("Request sent. Upload your documents, then pay.");
    await load();
  }

  async function upload(requestId: string, form: FormData) {
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1) {
      setMessage("Choose a file in the upload form before submitting.");
      return;
    }
    setBusy(true);
    setMessage("Uploading…");
    const res = await fetch(`/api/apply/${requestId}/documents`, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Upload failed.");
      return;
    }
    // Success only after server confirms the file and DB record.
    setMessage(`Saved: ${data.document?.kind || "document"} — ${data.document?.name || file.name}`);
    // Optimistically append then refresh from server so the list is authoritative.
    if (data.document?.id) {
      setRequests((current) => current.map((row) => row.id === requestId
        ? { ...row, documents: [...row.documents, { id: data.document.id, kind: data.document.kind, name: data.document.name, size: data.document.size }] }
        : row));
    }
    await load();
  }

  async function uploadMultiple(requestId: string, kind: string, files: FileList | null) {
    if (!files || files.length === 0) {
      setMessage("Choose one or more files first.");
      return;
    }
    setBusy(true);
    const errors: string[] = [];
    let saved = 0;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const res = await fetch(`/api/apply/${requestId}/documents`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errors.push(`${file.name}: ${data.error || "failed"}`);
        continue;
      }
      saved += 1;
      if (data.document?.id) {
        setRequests((current) => current.map((row) => row.id === requestId
          ? { ...row, documents: [...row.documents, { id: data.document.id, kind: data.document.kind, name: data.document.name, size: data.document.size }] }
          : row));
      }
    }
    setBusy(false);
    setMessage(errors.length
      ? `Saved ${saved}. Errors: ${errors.join("; ")}`
      : `Saved ${saved} document${saved === 1 ? "" : "s"} for this request.`);
    await load();
  }

  async function pay(requestId: string) {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/apply/${requestId}/checkout`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.url) window.location.href = data.url;
    else setMessage(data.error || "Checkout is not available.");
  }

  async function approve(requestId: string, itemId: string) {
    setBusy(true);
    const res = await fetch(`/api/apply/${requestId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(data.note || data.error || "Approval recorded.");
    await load();
  }

  const current = requests.find((row) => row.id === active) || requests[0];

  return (
    <div className="page-container py-10">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--violet)]">Apply for Me</p>
      <h1 className="section-title mt-2">Already know where you want to apply?</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">These are one-time application packages, not a subscription. Choose the universities yourself, upload documents once, then review and approve before anything is submitted.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button type="button" className={packageId === "intro" ? "card border-[#c4b5fd] p-4 text-left" : "card p-4 text-left"} onClick={() => { setPackageId("intro"); setChosen([]); setMessage(""); }}>
          <p className="text-sm font-semibold text-[var(--navy)]">Three applications</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--navy)]">$30</p>
          <p className="mt-1 text-xs text-gray-500">One-time offer. $10 each.</p>
        </button>
        <button type="button" className={packageId === "set" ? "card border-[#c4b5fd] p-4 text-left" : "card p-4 text-left"} onClick={() => { setPackageId("set"); setChosen([]); }}>
          <p className="text-sm font-semibold text-[var(--navy)]">Five applications</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--navy)]">$65</p>
          <p className="mt-1 text-xs text-gray-500">One-time. $13 each.</p>
        </button>
        <button type="button" className={packageId === "custom" ? "card border-[#c4b5fd] p-4 text-left" : "card p-4 text-left"} onClick={() => { setPackageId("custom"); setChosen([]); }}>
          <p className="text-sm font-semibold text-[var(--navy)]">Custom</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--navy)]">$12</p>
          <p className="mt-1 text-xs text-gray-500">Each, for 6 to 12 applications.</p>
        </button>
      </div>
      <ol className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--gray-700)]">
        {STEPS.map((step) => <li key={step} className="rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-2.5 py-1">{step}</li>)}
      </ol>
      <p className="mt-3 max-w-2xl text-xs text-[var(--gray-500)]">ProFinder does not replace discovery, and it never submits an application you have not approved. A status of submit requested means your approval is queued. It is not a claim that a university portal has accepted the form.</p>

      {status !== "authenticated" ? (
        <p className="mt-8 text-sm">Sign in to start a request. <Link className="font-semibold text-[var(--teal)]" href="/login">Log in</Link></p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="card p-5">
            <h2 className="font-semibold text-[var(--navy)]">1. Choose {limit()} universities</h2>
            {packageId === "custom" && <label className="mt-3 block text-xs text-gray-600">How many?<input className="input mt-1 max-w-[8rem]" type="number" min={6} max={12} value={customCount} onChange={(event) => { setCustomCount(Number(event.target.value)); setChosen([]); }} /></label>}
            <form onSubmit={search} className="mt-3 flex gap-2">
              <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Stored university name" />
              <button className="btn-secondary" type="submit">Search</button>
            </form>
            <ul className="mt-3 space-y-2 text-sm">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button type="button" className="text-left text-[var(--navy)]" onClick={() => addUniversity(hit)}>{hit.name}</button>
                  <span className="text-gray-500"> · {[hit.city, hit.country || "China"].filter(Boolean).join(", ")}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-4 space-y-1 text-sm">
              {chosen.map((row) => <li key={row.id}>{row.name} <button type="button" className="text-xs text-[var(--gray-500)]" onClick={() => setChosen((current) => current.filter((item) => item.id !== row.id))}>Remove</button></li>)}
            </ul>
            <textarea className="input mt-3 min-h-[80px]" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the application team" />
            <p className="mt-1 text-xs text-gray-500">{chosen.length} of {limit()} selected. The button stays usable and tells you what is missing.</p>
            <button type="button" className="btn-primary mt-3" disabled={busy} onClick={createRequest}>Send request</button>
            {message && <p className="mt-3 text-sm text-[var(--gray-700)]">{message}</p>}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-[var(--navy)]">2. Upload, pay, review</h2>
            {!current ? <p className="mt-3 text-sm text-gray-500">No request yet.</p> : (
              <div className="mt-3 space-y-4 text-sm">
                <p>Fee: ${(current.feeCents / 100).toFixed(0)} for {current.items.length} application{current.items.length === 1 ? "" : "s"}. Payment: {current.paymentStatus}. Status: {current.status.replaceAll("_", " ")}.</p>
                <ul className="space-y-2">
                  {current.items.map((item) => (
                    <li key={item.id} className="rounded-md border border-[var(--gray-200)] p-3">
                      <p className="font-medium text-[var(--navy)]">{item.university.name} — {item.status.replaceAll("_", " ")}</p>
                      {item.preparationNote && <p className="mt-1 text-xs text-gray-600">{item.preparationNote}</p>}
                      {item.status === "ready_for_review" && <button type="button" className="btn-primary mt-2 text-xs" disabled={busy} onClick={() => approve(current.id, item.id)}>Approve & submit</button>}
                    </li>
                  ))}
                </ul>
                <div>
                  <p className="text-xs font-medium text-[var(--navy)]">Documents on this request</p>
                  {current.documents.length === 0
                    ? <p className="mt-1 text-xs text-gray-500">No documents saved yet. Upload at least one (CV, transcript, passport, or other) before paying.</p>
                    : <ul className="mt-1 space-y-1 text-xs text-gray-600">{current.documents.map((doc) => <li key={doc.id}>{doc.kind}: {doc.name} ({Math.round(doc.size / 1024)} KB)</li>)}</ul>}
                </div>
                <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); upload(current.id, new FormData(event.currentTarget)); }}>
                  <select name="kind" className="input max-w-[10rem]" defaultValue="cv">
                    <option value="passport">Passport</option>
                    <option value="transcript">Transcript</option>
                    <option value="cv">CV / Resume</option>
                    <option value="statement">Statement</option>
                    <option value="other">Other</option>
                  </select>
                  <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" className="text-xs" />
                  <button className="btn-secondary text-xs" type="submit" disabled={busy}>Upload document</button>
                </form>
                <form className="flex flex-wrap gap-2" onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const kind = (form.elements.namedItem("kind") as HTMLSelectElement)?.value || "other";
                  const input = form.elements.namedItem("files") as HTMLInputElement;
                  uploadMultiple(current.id, kind, input.files);
                  form.reset();
                }}>
                  <select name="kind" className="input max-w-[10rem]" defaultValue="other">
                    <option value="passport">Passport</option>
                    <option value="transcript">Transcript</option>
                    <option value="cv">CV / Resume</option>
                    <option value="statement">Statement</option>
                    <option value="other">Other</option>
                  </select>
                  <input name="files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" className="text-xs" />
                  <button className="btn-secondary text-xs" type="submit" disabled={busy}>Upload selected</button>
                </form>
                <button type="button" className="btn-primary" disabled={busy || current.paymentStatus === "paid" || current.documents.length < 1} onClick={() => pay(current.id)}>
                  {current.documents.length < 1 ? "Upload a document to pay" : `Pay $${(current.feeCents / 100).toFixed(0)}`}
                </button>
              </div>
            )}
            {message && <p className="mt-3 text-sm text-[var(--gray-700)]">{message}</p>}
          </section>
        </div>
      )}
      {session && requests.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          {requests.map((row) => <button key={row.id} type="button" className={row.id === current?.id ? "btn-primary text-xs" : "btn-secondary text-xs"} onClick={() => setActive(row.id)}>Request {row.id.slice(0, 6)}</button>)}
        </div>
      )}
    </div>
  );
}
