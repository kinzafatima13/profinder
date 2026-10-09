"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";

type AlertRow = {
  id: string;
  title: string;
  subtitle: string;
  deadline: string;
  source: "application" | "program";
  href: string;
};

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const collected: AlertRow[] = [];

      if (session) {
        try {
          const res = await fetch("/api/applications");
          const data = await res.json();
          for (const app of data.applications || []) {
            const deadline = app.deadline || app.scholarshipDeadline || app.followUpDate;
            if (!deadline) continue;
            const title =
              app.professor?.name ||
              app.programName ||
              app.scholarship ||
              "Saved application";
            collected.push({
              id: `app-${app.id}`,
              title,
              subtitle: `${app.status}${app.professor?.university?.name ? ` · ${app.professor.university.name}` : ""}`,
              deadline: String(deadline),
              source: "application",
              href: "/tracker",
            });
          }
        } catch {
          /* ignore */
        }
      }

      try {
        const res = await fetch("/api/opportunities");
        const data = await res.json();
        for (const program of data.programs || []) {
          if (!program.deadline) continue;
          collected.push({
            id: `prog-${program.id}`,
            title: `${program.degree} · ${program.major}`,
            subtitle: program.university,
            deadline: String(program.deadline),
            source: "program",
            href: "/programs",
          });
        }
        for (const sch of data.scholarships || []) {
          if (!sch.deadline) continue;
          collected.push({
            id: `sch-${sch.id}`,
            title: sch.name || "Scholarship",
            subtitle: sch.university || "",
            deadline: String(sch.deadline),
            source: "program",
            href: "/scholarship",
          });
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) {
        setRows(collected);
        setNote(
          session
            ? "Dates come from your Applications and stored catalog notes. They are not official countdowns."
            : "Sign in to include your Applications. Catalog dates below are stored notes only — confirm on the official page."
        );
        setLoading(false);
      }
    }
    if (status !== "loading") load();
    return () => {
      cancelled = true;
    };
  }, [session, status]);

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Deadline alerts"
        description="A single place to scan stored deadlines from your tracker and featured catalog rows. ProFinder does not send email alerts yet — check this page or your Applications list."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/tracker" className="btn-secondary text-sm">
              Applications
            </Link>
            {!session && (
              <Link href="/login?callbackUrl=/alerts" className="btn-primary text-sm">
                Sign in
              </Link>
            )}
          </div>
        }
      />

      <p className="mt-4 text-sm text-[var(--gray-600)]">{note}</p>

      {loading && <p className="mt-6 text-sm text-[var(--gray-500)]">Loading deadlines…</p>}

      {!loading && rows.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-[var(--gray-200)] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[var(--navy)]">No deadline notes to show</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-600)]">
            Save a program or scholarship to Applications, or browse Funding for stored award windows.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/scholarship" className="btn-primary text-sm">
              Funding
            </Link>
            <Link href="/programs" className="btn-secondary text-sm">
              Programs
            </Link>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ul className="mt-6 divide-y divide-[var(--gray-100)] overflow-hidden rounded-lg border border-[var(--gray-200)] bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-[var(--navy)]">{row.title}</p>
                <p className="text-sm text-[var(--gray-600)]">{row.subtitle}</p>
                <p className="mt-1 text-xs text-[var(--gray-500)]">
                  {row.source === "application" ? "From your Applications" : "Catalog note"} · Unverified until you check the
                  official page
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <span className="text-sm text-[var(--gray-700)]">{row.deadline}</span>
                <Link href={row.href} className="text-sm font-medium text-[var(--teal-dark)] hover:underline">
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-[var(--gray-500)]">
        Email or push alerts are not enabled. For product questions, see{" "}
        <Link href="/support" className="underline">
          Support
        </Link>
        .
      </p>
    </div>
  );
}
