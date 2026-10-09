"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";

const STEPS = [
  {
    id: "account",
    title: "Create your account",
    body: "Sign up so matches, tracker items, and profile details stay with you across devices.",
    href: "/signup",
    cta: "Sign up",
    altHref: "/login",
    altCta: "Log in",
  },
  {
    id: "profile",
    title: "Add degree and research interests",
    body: "A short profile powers scoring on Find My Match and Funding. You can refine it later.",
    href: "/profile",
    cta: "Open profile",
  },
  {
    id: "match",
    title: "Run your first match",
    body: "Describe what you want to study. Results only use stored universities, programs, and professors.",
    href: "/find",
    cta: "Find My Match",
  },
  {
    id: "save",
    title: "Save one opportunity",
    body: "Add a professor, program, or scholarship to Applications so deadlines and notes live in one place.",
    href: "/tracker",
    cta: "Open Applications",
  },
] as const;

const DONE_KEY = "profinder_onboarding_done";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const [profileReady, setProfileReady] = useState(false);
  const [hasApps, setHasApps] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem(DONE_KEY) === "1");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        const p = data.profile || {};
        setProfileReady(Boolean(p.degree || p.major || p.researchInterests));
      })
      .catch(() => undefined);
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => setHasApps(Array.isArray(data.applications) && data.applications.length > 0))
      .catch(() => undefined);
  }, [session]);

  function markDone() {
    if (typeof window !== "undefined") window.localStorage.setItem(DONE_KEY, "1");
    setDismissed(true);
  }

  const signedIn = Boolean(session);

  function stepDone(id: string) {
    if (id === "account") return signedIn;
    if (id === "profile") return profileReady;
    if (id === "save") return hasApps;
    return false;
  }

  return (
    <div className="page-container py-8">
      <PageHeader
        title="Get started"
        description="Four short steps. Skip any time — you can always come back from the footer or account menu."
        actions={
          <button type="button" className="btn-secondary text-sm" onClick={markDone}>
            {dismissed ? "Marked complete" : "Mark onboarding complete"}
          </button>
        }
      />

      {status === "loading" && <p className="mt-6 text-sm text-[var(--gray-500)]">Checking your account…</p>}

      <ol className="mt-8 grid gap-4">
        {STEPS.map((step, index) => {
          const done = stepDone(step.id);
          return (
            <li key={step.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)]">
                  Step {index + 1}
                  {done ? " · Done" : ""}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--navy)]">{step.title}</h2>
                <p className="mt-1 text-sm text-[var(--gray-600)]">{step.body}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {done ? (
                  <span className="rounded-full bg-[var(--gray-100)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)]">
                    Complete
                  </span>
                ) : step.id === "account" && signedIn ? null : (
                  <>
                    <Link
                      href={step.id === "account" && signedIn ? "/profile" : step.href}
                      className="btn-primary text-sm"
                    >
                      {step.cta}
                    </Link>
                    {"altHref" in step && step.altHref && !signedIn && (
                      <Link href={step.altHref} className="btn-secondary text-sm">
                        {step.altCta}
                      </Link>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 rounded-lg border border-[var(--gray-200)] bg-white p-5">
        <h2 className="font-semibold text-[var(--navy)]">Need help?</h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">
          Plans, data limits, and how to reach us are on the support page. Deadlines in ProFinder are stored notes — always
          confirm on the official university page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/support" className="btn-secondary text-sm">
            Support
          </Link>
          <Link href="/pricing" className="btn-secondary text-sm">
            Plans
          </Link>
          <Link href="/scholarship" className="btn-secondary text-sm">
            Funding
          </Link>
        </div>
      </div>
    </div>
  );
}
