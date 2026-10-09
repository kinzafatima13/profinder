import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Support | ProFinder" },
  description: "How ProFinder works, plan limits, data honesty, and how to get help.",
  alternates: { canonical: `${SITE}/support` },
};

const FAQS = [
  {
    q: "What is ProFinder?",
    a: "A discovery tool for stored Chinese universities, programs, professors, and funding notes. Match scores are informational overlap from your profile and stored records — not admission predictions.",
  },
  {
    q: "What is free vs Pro?",
    a: "Free includes browsing and limited monthly match searches, outreach drafts, comparisons, and active applications. Pro removes those monthly caps. Pro does not invent programs, scholarships, or deadlines that are not stored.",
  },
  {
    q: "Why are deadlines marked unverified?",
    a: "Many catalog dates are notes from import, not live official pages. Always confirm on the university or Campus China page before you apply.",
  },
  {
    q: "How do I reset my password?",
    a: "Use Forgot password on the login page. If email delivery is unavailable, contact support with the account email.",
  },
  {
    q: "Payments and refunds",
    a: "Pro and Apply for Me are charged through Stripe when checkout is configured. Successful payment is confirmed by Stripe webhook, not by the success URL alone. For billing questions, email support with your account email and approximate charge time.",
  },
  {
    q: "Apply for Me documents",
    a: "Upload only files you are allowed to share. Documents are tied to your apply request. Do not upload files for other people without consent.",
  },
];

export default function SupportPage() {
  return (
    <div className="page-container py-8">
      <PageHeader
        title="Support"
        description="Honest product limits, plan transparency, and how to reach us."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/onboarding" className="btn-secondary text-sm">
              Get started
            </Link>
            <Link href="/pricing" className="btn-secondary text-sm">
              Plans
            </Link>
          </div>
        }
      />

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="card p-5">
          <h2 className="font-semibold text-[var(--navy)]">Contact</h2>
          <p className="mt-2 text-sm text-[var(--gray-600)]">
            Email{" "}
            <a className="font-medium text-[var(--teal-dark)] hover:underline" href="mailto:support@profindernow.com">
              support@profindernow.com
            </a>
            . Include your account email and what you were trying to do. We do not provide admissions advice or guarantee
            offers.
          </p>
        </article>
        <article className="card p-5">
          <h2 className="font-semibold text-[var(--navy)]">Quick links</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <Link className="font-medium text-[var(--teal-dark)] hover:underline" href="/onboarding">
                Onboarding
              </Link>
            </li>
            <li>
              <Link className="font-medium text-[var(--teal-dark)] hover:underline" href="/pricing">
                Transparent plans
              </Link>
            </li>
            <li>
              <Link className="font-medium text-[var(--teal-dark)] hover:underline" href="/alerts">
                Deadline alerts
              </Link>
            </li>
            <li>
              <Link className="font-medium text-[var(--teal-dark)] hover:underline" href="/searches">
                Saved searches
              </Link>
            </li>
            <li>
              <Link className="font-medium text-[var(--teal-dark)] hover:underline" href="/forgot-password">
                Password reset
              </Link>
            </li>
          </ul>
        </article>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--navy)]">FAQ</h2>
        <dl className="mt-4 grid gap-4">
          {FAQS.map((item) => (
            <div key={item.q} className="rounded-lg border border-[var(--gray-200)] bg-white p-4">
              <dt className="font-medium text-[var(--navy)]">{item.q}</dt>
              <dd className="mt-2 text-sm text-[var(--gray-600)]">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
