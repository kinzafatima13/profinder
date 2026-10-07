import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const major = await prisma.major.findUnique({ where: { slug: params.slug }, include: { discipline: { include: { academicField: true } } } });
  if (!major) return { title: "Major | ProFinder", robots: { index: false } };
  return { title: { absolute: major.name + " Programs | ProFinder" }, description: "Universities and graduate programs stored for " + major.name + ".", alternates: { canonical: SITE + "/majors/" + major.slug } };
}

export default async function MajorPage({ params }: { params: { slug: string } }) {
  const major = await prisma.major.findUnique({
    where: { slug: params.slug },
    include: {
      discipline: { include: { academicField: true } },
      programs: { where: { verificationStatus: "VERIFIED" }, include: { university: true }, orderBy: { university: { name: "asc" } }, take: 100 },
    },
  });
  if (!major) notFound();
  return <div className="page-container py-10">
    <nav className="text-xs text-gray-500"><Link href="/majors">Majors</Link> / {major.name}</nav>
    <h1 className="mt-3 section-title">{major.name}</h1>
    <p className="mt-2 text-sm text-gray-600">{major.discipline.academicField.name} · {major.discipline.name}</p>
    <h2 className="mt-8 text-lg font-semibold text-[var(--navy)]">Verified programs</h2>
    <div className="mt-4 space-y-3">
      {major.programs.map((p) => <Link key={p.id} href={"/universities/" + p.universityId} className="block card p-4">
        <span className="font-semibold">{p.university.name}</span><span className="ml-2 text-sm text-gray-500">{p.degree}</span>
      </Link>)}
      {major.programs.length === 0 && <p className="text-sm text-gray-500">No verified program is stored for this major yet.</p>}
    </div>
  </div>;
}
