"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/universities", label: "Universities" },
  { href: "/professors", label: "Professors" },
  { href: "/find", label: "Find Professors" },
  { href: "/topics", label: "Topics" },
  { href: "/search", label: "Search" },
  { href: "/tracker", label: "Tracker" },
  { href: "/scholarship", label: "Scholarship" },
  { href: "/resume", label: "Resume" },
  { href: "/pricing", label: "Pricing" },
];

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
              <path d="M11 8 L11 14 M8 11 L14 11" stroke="#00b4a6" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <span className="text-lg font-bold tracking-tight text-[var(--navy)]">
              PROFINDER
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--light-teal)] text-[var(--teal-dark)]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
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

      <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 md:hidden">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-[var(--light-teal)] text-[var(--teal-dark)]"
                  : "text-gray-600"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
