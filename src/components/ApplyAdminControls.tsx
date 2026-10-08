"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyAdminControls({ requestId, status, founderNote, items }: { requestId: string; status: string; founderNote: string; items: { id: string; status: string; preparationNote: string }[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [note, setNote] = useState(founderNote);
  const [nextStatus, setNextStatus] = useState(status);

  async function saveRequest() {
    const res = await fetch(`/api/admin/apply/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, founderNote: note }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Saved." : data.error || "Could not save.");
    if (res.ok) router.refresh();
  }

  async function saveItem(itemId: string, itemStatus: string, preparationNote: string) {
    const res = await fetch(`/api/admin/apply/${requestId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: itemStatus, preparationNote }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Application updated." : data.error || "Could not update.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select className="input max-w-[14rem]" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
          {["draft", "awaiting_payment", "documents_pending", "ready_for_review", "preparing", "submit_requested", "completed", "needs_action", "cancelled"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
        <button type="button" className="btn-primary" onClick={saveRequest}>Save request</button>
      </div>
      <textarea className="input min-h-[90px]" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Private founder note. Students do not see this." />
      {items.map((item) => <ItemRow key={item.id} item={item} onSave={saveItem} />)}
      {message && <p className="text-sm text-[var(--gray-700)]">{message}</p>}
    </div>
  );
}

function ItemRow({ item, onSave }: { item: { id: string; status: string; preparationNote: string }; onSave: (id: string, status: string, note: string) => void }) {
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.preparationNote);
  return (
    <div className="flex flex-wrap gap-2">
      <select className="input max-w-[12rem]" value={status} onChange={(event) => setStatus(event.target.value)}>
        {["selected", "pending", "preparing", "ready_for_review", "approved", "submitted", "successful", "rejected", "needs_action"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select>
      <input className="input max-w-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Shown to the student on this application" />
      <button type="button" className="btn-secondary" onClick={() => onSave(item.id, status, note)}>Update application</button>
    </div>
  );
}
