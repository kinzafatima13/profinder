import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess } from "@/lib/billing/access";
import ManageBillingButton from "@/components/ManageBillingButton";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams?: { checkout?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="page-container py-16 text-center">
        <h1 className="section-title">Billing</h1>
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
  const pro = hasProAccess(student.plan, sub);
  const waiting = searchParams?.checkout === "success" && !pro;
  const renews = sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString().slice(0, 10) : null;
  const price = sub?.plan === "PRO_ANNUAL" ? "$89.99/year" : sub?.plan === "PRO_MONTHLY" ? "$9.99/month" : null;

  return (
    <div className="page-container py-12">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--gray-500)]">Settings</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--navy)]">Billing & Subscription</h1>
      {waiting && <p className="mt-4 max-w-xl text-sm text-[var(--gray-700)]">Stripe sent you back here. Pro turns on when the webhook confirms the payment. Refresh in a moment.</p>}
      <article className="mt-6 max-w-xl rounded-lg border border-[var(--gray-200)] p-5">
        <p className="text-sm text-[var(--gray-500)]">{pro ? "ProFinder Pro" : "ProFinder Free"}</p>
        <p className="mt-1 text-xl font-semibold text-[var(--navy)]">{sub?.status || (pro ? "Legacy Pro" : "Free")}</p>
        {price && <p className="mt-2 text-sm text-[var(--gray-700)]">{price}</p>}
        {renews && <p className="mt-1 text-sm text-[var(--gray-700)]">Current period ends {renews}.</p>}
        {sub?.cancelAtPeriodEnd && renews && <p className="mt-2 text-sm text-[var(--warn)]">Your Pro subscription will end on {renews}.</p>}
        {sub?.status === "PAST_DUE" && <p className="mt-2 text-sm text-[var(--warn)]">The last payment did not succeed. Update the card in the billing portal.</p>}
        {!pro && !sub && student.plan !== "pro" && <p className="mt-2 text-sm text-[var(--gray-700)]">You are on the Free plan.</p>}
        {pro && !sub && <p className="mt-2 text-sm text-[var(--gray-700)]">This Pro access was granted before Stripe billing. It is not a new manual approval.</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {!pro && <Link href="/pricing" className="btn-primary">Upgrade to Pro</Link>}
          {sub?.providerCustomerId && <ManageBillingButton />}
        </div>
      </article>
    </div>
  );
}
