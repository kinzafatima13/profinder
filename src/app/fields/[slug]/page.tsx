import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const field = await prisma.academicField.findUnique({ where: { slug: params.slug } });
  if (!field) return { title: "Academic Field | ProFinder", robots: { index: false } };
  return { title: { absolute: field.name + " | ProFinder" }, description: "Explore disciplines, majors and graduate programs in " + field.name + ".", alternates: { canonical: SITE + "/fields/" + field.slug } };
}

export default async function FieldPage({ params }: { params: { slug: string } }) {
  const field = await prisma.academicField.findUnique({
    where: { slug: params.slug },
    include: { disciplines: { orderBy: { name: "asc" }, include: { _count: { select: { majors: true, programs: true } } } } },
  });
  if (!field) notFound();
  return <div className="page-container py-10">
    <nav className="text-xs text-gray-500"><Link href="/fields">Academic fields</Link> / {field.name}</nav>
    <h1 className="mt-3 section-title">{field.name}</h1>
    <p className="mt-2 max-w-2xl text-gray-600">Only disciplines and programs actually loaded into the database are shown.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {field.disciplines.map((d) => <Link key={d.id} href={"/majors?discipline=" + encodeURIComponent(d.name)} className="card p-5">
        <h2 className="font-semibold text-[var(--navy)]">{d.name}</h2>
        <p className="mt-2 text-xs text-gray-500">{d._count.majors} majors · {d._count.programs} programs</p>
      </Link>)}
    </div>
  </div>;
}
