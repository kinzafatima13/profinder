"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Section = { heading: string; text: string };

export default function ProposalButton({ professorId }: { professorId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [open, setOpen] = useState(false);

  async function draft() {
    if (!session) {
      router.push(`/login?callbackUrl=/professors/${professorId}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not draft a proposal");
      setTitle(data.title);
      setDisclaimer(data.disclaimer);
      setSections(data.sections ?? []);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft a proposal");
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    const text = [`Title: ${title}`, "", disclaimer, "", ...sections.flatMap((section) => [section.heading, section.text, ""])].join("\n");
    navigator.clipboard.writeText(text);
  }

  return (
    <div>
      <button onClick={draft} disabled={loading} className="btn-secondary w-full text-sm">
        {loading ? "Drafting..." : "Draft research proposal"}
      </button>
      {error && <p className="mt-2 text-center text-xs text-amber-700">{error}</p>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-[var(--navy)]">Research proposal draft</h3>
            <p className="mt-1 text-xs text-gray-500">{disclaimer}</p>
            <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{title}</p>
            <div className="mt-3 space-y-3">
              {sections.map((section) => (
                <section key={section.heading}>
                  <h4 className="text-sm font-semibold text-[var(--navy)]">{section.heading}</h4>
                  <p className="mt-1 text-sm text-gray-700">{section.text}</p>
                </section>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={copyAll} className="btn-primary text-sm">Copy draft</button>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
