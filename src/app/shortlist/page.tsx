import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Shortlist",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE}/shortlist` },
};

export default async function ShortlistPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return (
      <div className="page-container py-10">
        <h1 className="section-title">My Shortlist</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in to see professors you saved. Nothing is shown to other students.</p>
        <Link href="/login" className="btn-primary mt-4 inline-block">Sign in</Link>
      </div>
    );
  }

  const student = await prisma.student.findUnique({
    where: { email },
    include: {
      savedProfessors: {
        orderBy: { createdAt: "desc" },
        include: {
          professor: { include: { university: true, researchAreas: { include: { researchArea: true } } } },
        },
      },
    },
  });

  const items = student?.savedProfessors ?? [];

  return (
    <div className="page-container py-10">
      <h1 className="section-title">My Shortlist</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">
        Saved professors from the existing shortlist. Notes and status live on the application tracker so existing records stay intact.
      </p>
      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          No saved professors yet. Open a professor profile and save it.
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {items.map((item) => {
            const professor = item.professor;
            const verified = professor.dataStatus === "verified";
            return (
              <li key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">{verified ? "Officially verified" : "Not yet verified"}</p>
                <Link href={`/professors/${professor.id}`} className="mt-1 block text-lg font-medium text-[var(--navy)]">{professor.name}</Link>
                <p className="text-sm text-gray-600">{professor.university.name}{professor.department ? ` · ${professor.department}` : ""}</p>
                <p className="mt-2 text-sm text-gray-700">{professor.researchInterests || "Research interests not yet verified."}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  <Link className="underline" href={`/professors/${professor.id}`}>Profile</Link>
                  <Link className="underline" href="/tracker">Add to applications</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
