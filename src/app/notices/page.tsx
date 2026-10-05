import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreProfile } from "@/lib/profile-score";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="page-container py-16 text-center">
        <h1 className="section-title">Notices</h1>
        <p className="mt-2 text-gray-600">Sign in to see notices from your profile and tracker. Email alerts are not sent.</p>
        <Link href="/login?callbackUrl=/notices" className="btn-primary mt-4 inline-flex">Sign in</Link>
      </div>
    );
  }

  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) {
    return <div className="page-container py-10 text-gray-600">Account not found.</div>;
  }

  const apps = await prisma.application.findMany({
    where: { studentId: student.id },
    include: { professor: true },
  });
  const fit = scoreProfile(student);
  const waiting = apps.filter((row) => row.status === "Saved" || row.status === "Researching");
  const notices = [
    fit.gaps.length
      ? { title: "Profile", text: fit.next, href: "/profile" }
      : { title: "Profile", text: "The saved profile fields are filled.", href: "/profile" },
    waiting.length
      ? { title: "Tracker", text: `${waiting.length} saved item${waiting.length === 1 ? "" : "s"} still need a status update or an email.`, href: "/tracker" }
      : { title: "Tracker", text: apps.length ? "Nothing is sitting at Saved." : "No applications are saved yet.", href: "/tracker" },
    { title: "Deadlines", text: "Deadline text in the database is unverified. Days remaining are not calculated, and no reminder email is sent.", href: "/scholarship" },
    { title: "Matches", text: "Open Topics or Find Professors to review stored faculty. This page does not invent new alerts.", href: "/topics" },
  ];

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Notices</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">In-app only. These come from your saved profile and tracker, not from a new email feed.</p>
      <ul className="mt-6 space-y-3">
        {notices.map((notice) => (
          <li key={notice.title} className="card p-4">
            <p className="text-sm font-semibold text-[var(--navy)]">{notice.title}</p>
            <p className="mt-1 text-sm text-gray-700">{notice.text}</p>
            <Link href={notice.href} className="mt-2 inline-flex text-sm font-semibold text-[var(--teal)]">Open</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
