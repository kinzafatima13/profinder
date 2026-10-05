import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreProfile } from "@/lib/profile-score";
import { scoreScholarship } from "@/lib/eligibility";

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
  const scholarships = await prisma.scholarship.findMany({
    include: { university: { select: { name: true } } },
    take: 40,
  });
  const seen = new Set<string>();
  const fundingAlerts = scholarships
    .filter((row) => {
      const key = `${row.type}:${row.universityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((row) => {
      const fit = scoreScholarship(
        {
          degree: student.degree,
          major: student.major,
          interests: student.researchInterests,
          gpa: student.gpa,
          preferredCountries: student.preferredCountries,
          preferredUniversities: student.preferredUniversities,
          nationality: student.nationality,
        },
        { name: row.name, type: row.type, universityName: row.university?.name, deadline: row.deadline }
      );
      return { id: row.id, name: row.name, university: row.university?.name || "University not linked", score: fit.score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const fit = scoreProfile(student);
  const waiting = apps.filter((row) => row.status === "Saved" || row.status === "Researching");
  const notices = [
    fit.gaps.length
      ? { title: "Profile", text: fit.next, href: "/profile" }
      : { title: "Profile", text: "The saved profile fields are filled.", href: "/profile" },
    waiting.length
      ? { title: "Tracker", text: `${waiting.length} saved item${waiting.length === 1 ? "" : "s"} still need a status update or an email.`, href: "/tracker" }
      : { title: "Tracker", text: apps.length ? "Nothing is sitting at Saved." : "No applications are saved yet.", href: "/tracker" },
    { title: "Deadline changes", text: "No countdown or change alert is available. None of the stored deadlines are verified official dates, and email is not sent.", href: "/" },
    { title: "Funding records", text: fundingAlerts.length ? `Current records, not new alerts: ${fundingAlerts.map((item) => `${item.name} at ${item.university} (${item.score}%)`).join("; ")}.` : "No scholarship records are stored.", href: "/scholarship" },
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
