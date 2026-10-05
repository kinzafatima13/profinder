"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/universities", label: "Discover" },
  { href: "/professors", label: "Professors" },
  { href: "/scholarship", label: "Scholarships" },
  { href: "/tracker", label: "Applications" },
];

const more = [
  { href: "/find", label: "Find professors" },
  { href: "/topics", label: "Topics" },
  { href: "/search", label: "Search" },
  { href: "/profile", label: "Profile" },
  { href: "/compare", label: "Compare" },
  { href: "/notices", label: "Notices" },
  { href: "/assistant", label: "Assistant" },
  { href: "/pricing", label: "Pricing" },
  { href: "/billing", label: "Billing" },
];

function itemClass(active: boolean) {
  return `rounded-md px-3 py-2 text-sm font-medium ${
    active ? "bg-[var(--light-teal)] text-[var(--teal-dark)]" : "text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
  }`;
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const plan = (session?.user as { plan?: string } | undefined)?.plan;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="page-container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--navy)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#0a2540" strokeWidth="2.2" />
              <path d="M16 16 L20 20" stroke="#0a2540" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M11 8 L11 14 M8 11 L14 11" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <span className="text-sm font-semibold tracking-tight text-[var(--navy)]">ProFinder</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={itemClass(active)}
              >
                {l.label}
              </Link>
            );
          })}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">More</summary>
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-[var(--gray-200)] bg-white p-1">
              {more.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <span className="text-xs text-gray-400">...</span>
          ) : session ? (
            <>
              {plan === "pro" ? (
                <span className="badge-teal hidden sm:inline">Pro</span>
              ) : (
                <Link href="/pricing" className="badge-navy hidden sm:inline hover:opacity-80">
                  Free · Upgrade
                </Link>
              )}
              <Link href="/profile" className="btn-ghost text-xs sm:text-sm max-w-[120px] truncate">
                {session.user?.name || session.user?.email}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="btn-secondary text-xs sm:text-sm"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-xs sm:text-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary text-xs sm:text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-[var(--gray-200)] px-4 py-2 md:hidden" aria-label="Mobile">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href} className={`whitespace-nowrap ${itemClass(active)}`}>
              {l.label}
            </Link>
          );
        })}
        <details className="relative">
          <summary className="cursor-pointer list-none whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--gray-700)]">More</summary>
          <div className="absolute left-0 z-50 mt-1 w-44 rounded-md border border-[var(--gray-200)] bg-white p-1 shadow-sm">
            {more.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-50)]">
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}
