import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="page-container py-16">
        <h1 className="section-title">Settings</h1>
        <Link href="/login?callbackUrl=/settings" className="btn-primary mt-4 inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="page-container py-12">
      <h1 className="text-2xl font-semibold text-[var(--navy)]">Settings</h1>
      <p className="mt-2 text-sm text-[var(--gray-700)]">Account tools for {session.user.name || session.user.email}.</p>
      <ul className="mt-6 max-w-md divide-y divide-[var(--gray-200)] border-y border-[var(--gray-200)] text-sm">
        <li><Link href="/profile" className="block py-3 text-[var(--navy)]">Profile</Link></li>
        <li><Link href="/billing" className="block py-3 text-[var(--navy)]">Billing & Subscription</Link></li>
        <li><Link href="/pricing" className="block py-3 text-[var(--navy)]">Plans</Link></li>
      </ul>
    </div>
  );
}
