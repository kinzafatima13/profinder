import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE, clip, slugify } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function findArea(slug: string) {
  const areas = await prisma.researchArea.findMany({ select: { id: true, name: true, description: true } });
  return areas.find((area) => slugify(area.name) === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: { params: { slug: string }; searchParams?: { page?: string } }): Promise<Metadata> {
  const area = await findArea(params.slug);
  if (!area) return { title: "Research area", robots: { index: false, follow: false } };
  const count = await prisma.professorResearchArea.count({ where: { researchAreaId: area.id } });
  const paged = Number(searchParams?.page || "1") > 1;
  return {
    title: { absolute: `${area.name} Professors | ProFinder` },
    description: clip(`${count} professor records are tagged ${area.name}. ${area.description || "Open a profile to see what is actually stored."}`),
    alternates: { canonical: `${SITE}/research-areas/${slugify(area.name)}` },
    robots: paged ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ResearchAreaPage({ params, searchParams }: { params: { slug: string }; searchParams?: { page?: string } }) {
  const area = await findArea(params.slug);
  if (!area) notFound();
  const page = Math.max(1, Number(searchParams?.page || "1") || 1);
  const take = 24;
  const where = { researchAreas: { some: { researchAreaId: area.id } } };
  const [total, professors] = await Promise.all([
    prisma.professor.count({ where }),
    prisma.professor.findMany({
      where,
      orderBy: [{ dataStatus: "desc" }, { name: "asc" }],
      skip: (page - 1) * take,
      take,
      include: { university: { select: { name: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Research areas", item: `${SITE}/research-areas` },
      { "@type": "ListItem", position: 2, name: area.name, item: `${SITE}/research-areas/${slugify(area.name)}` },
    ],
  };

  return (
    <div className="page-container py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--gray-500)]">
        <Link href="/research-areas" className="hover:text-[var(--navy)]">Research areas</Link>
        <span> / </span>
        <span className="text-[var(--navy)]">{area.name}</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-[var(--navy)]">{area.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--gray-700)]">{total} professor records are tagged {area.name}. {area.description || "A tag does not verify the professor."}</p>
      <ul className="mt-6 divide-y divide-[var(--gray-200)] border-y border-[var(--gray-200)]">
        {professors.map((professor) => (
          <li key={professor.id} className="py-3">
            <Link href={`/professors/${professor.id}`} className="text-sm font-medium text-[var(--navy)]">{professor.name}</Link>
            <p className="text-xs text-[var(--gray-500)]">{professor.university.name}{professor.department ? ` · ${professor.department}` : ""} · {professor.dataStatus === "verified" ? "Verified" : "Unverified"}</p>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav className="mt-6 flex gap-3 text-sm" aria-label="Pages">
          {page > 1 && <Link href={`/research-areas/${params.slug}?page=${page - 1}`}>Previous</Link>}
          {page < pages && <Link href={`/research-areas/${params.slug}?page=${page + 1}`}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
