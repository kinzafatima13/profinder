import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess } from "@/lib/billing/access";
import ManageBillingButton from "@/components/ManageBillingButton";
import CheckoutButton from "@/components/CheckoutButton";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams?: { checkout?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="page-container py-16">
        <h1 className="text-2xl font-semibold text-[var(--navy)]">Billing & Subscription</h1>
        <Link href="/login?callbackUrl=/billing" className="btn-primary mt-4 inline-flex">Sign in</Link>
      </div>
    );
  }
  const student = await prisma.student.findUnique({
    where: { email: session.user.email },
    include: { subscription: true },
  });
  if (!student) return <div className="page-container py-10">Account not found.</div>;
  const sub = student.subscription;
  const pro = hasProAccess(sub);
  const returned = searchParams?.checkout === "success";
  const renews = sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString().slice(0, 10) : null;
  const price = sub?.plan === "PRO_ANNUAL" ? "$89.99/year" : sub?.plan === "PRO_MONTHLY" ? "$9.99/month" : null;

  return (
    <div className="page-container py-12">
      <h1 className="text-2xl font-semibold text-[var(--navy)]">Billing & Subscription</h1>
      {returned && !pro && (
        <p className="mt-4 max-w-xl text-sm text-[var(--gray-700)]">Coming back from checkout does not turn on Pro. Pro starts only after Stripe confirms the payment.</p>
      )}
      {!pro ? (
        <article className="mt-6 max-w-xl rounded-lg border border-[var(--gray-200)] bg-white p-5">
          <p className="text-sm text-[var(--gray-500)]">Current plan</p>
          <p className="mt-1 text-xl font-semibold text-[var(--navy)]">Free</p>
          <p className="mt-1 text-sm text-[var(--gray-700)]">$0</p>
          <ul className="mt-4 space-y-1 text-sm text-[var(--gray-700)]">
            <li>Unlimited professor matching</li>
            <li>Unlimited outreach drafts</li>
            <li>Unlimited applications and comparisons</li>
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-[var(--gray-200)] p-3">
              <p className="text-sm font-medium text-[var(--navy)]">Monthly</p>
              <p className="mt-1 text-sm text-[var(--gray-700)]">$9.99</p>
              <CheckoutButton plan="PRO_MONTHLY" label="Upgrade monthly" className="btn-primary mt-3 w-full" />
            </div>
            <div className="rounded-md border border-[var(--gray-200)] p-3">
              <p className="text-sm font-medium text-[var(--navy)]">Annual</p>
              <p className="mt-1 text-sm text-[var(--gray-700)]">$89.99</p>
              <CheckoutButton plan="PRO_ANNUAL" label="Upgrade annual" className="btn-secondary mt-3 w-full" />
            </div>
          </div>
        </article>
      ) : (
        <article className="mt-6 max-w-xl rounded-lg border border-[var(--gray-200)] bg-white p-5">
          <p className="text-sm text-[var(--gray-500)]">ProFinder Pro</p>
          <p className="mt-1 text-xl font-semibold text-[var(--navy)]">{sub?.status === "PAST_DUE" ? "Past due" : "Active"}</p>
          <p className="mt-2 text-sm text-[var(--gray-700)]">{price || "Paid subscription"}</p>
          {renews && <p className="mt-1 text-sm text-[var(--gray-700)]">Next billing date: {renews}</p>}
          {sub?.cancelAtPeriodEnd && renews && <p className="mt-2 text-sm text-[var(--warn)]">Your Pro subscription will end on {renews}. Saved applications stay.</p>}
          {sub?.status === "PAST_DUE" && <p className="mt-2 text-sm text-[var(--warn)]">The last payment failed. Update the card in the portal. Pro stays on while Stripe retries.</p>}
          <div className="mt-5">
            {sub?.providerCustomerId ? <ManageBillingButton /> : <p className="text-sm text-[var(--gray-700)]">The Stripe customer is not stored yet.</p>}
          </div>
          <p className="mt-3 text-xs text-[var(--gray-500)]">Invoices, payment method, and cancellation are in the Stripe customer portal.</p>
        </article>
      )}
    </div>
  );
}
