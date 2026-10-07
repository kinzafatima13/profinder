import type { Metadata } from "next";
import Link from "next/link";
import { ensureSchema, prisma } from "@/lib/prisma";
import AcademicSearchBox from "@/components/AcademicSearchBox";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Academic Fields | ProFinder" },
  description: "Browse academic fields represented in ProFinder's verified and reviewable graduate-program taxonomy.",
  alternates: { canonical: SITE + "/fields" },
};

export default async function FieldsPage() {
  await ensureSchema();
  const fields = await prisma.academicField.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { disciplines: true, programs: true, professors: true } } },
  });
  return <div className="page-container py-10">
    <h1 className="section-title">Academic fields</h1>
    <p className="mt-2 max-w-2xl text-gray-600">Start broad, then narrow to disciplines, majors, programs and researchers. ProFinder does not assume that every university offers every field.</p>
    <div className="mt-6"><AcademicSearchBox /></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => <Link key={f.id} href={"/fields/" + f.slug} className="card p-5 hover:border-[var(--teal)]">
        <h2 className="font-semibold text-[var(--navy)]">{f.name}</h2>
        <p className="mt-2 text-xs text-gray-500">{f._count.disciplines} disciplines · {f._count.programs} programs · {f._count.professors} linked professors</p>
      </Link>)}
    </div>
  </div>;
}
