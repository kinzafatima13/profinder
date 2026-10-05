import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE, slugify } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Research Areas | ProFinder" },
  description: "Research areas stored for professors at Chinese universities, including computer science, artificial intelligence, and cybersecurity.",
  alternates: { canonical: `${SITE}/research-areas` },
};

export default async function ResearchAreasPage() {
  const areas = await prisma.researchArea.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { professors: true } } },
  });

  return (
    <div className="page-container py-10">
      <h1 className="text-2xl font-semibold text-[var(--navy)]">Research areas</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--gray-700)]">These are the areas already tagged on professor records. A tag is not a claim that the professor was verified.</p>
      <ul className="mt-6 divide-y divide-[var(--gray-200)] border-y border-[var(--gray-200)]">
        {areas.map((area) => (
          <li key={area.id} className="flex items-center justify-between gap-4 py-3">
            <Link href={`/research-areas/${slugify(area.name)}`} className="text-sm font-medium text-[var(--navy)]">{area.name}</Link>
            <span className="text-xs text-[var(--gray-500)]">{area._count.professors} professors</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
