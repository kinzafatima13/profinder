import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE, slugify } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [universities, professors, areas, fields, majors] = await Promise.all([
    prisma.university.findMany({ select: { id: true, updatedAt: true } }),
    prisma.professor.findMany({ select: { id: true, updatedAt: true } }),
    prisma.researchArea.findMany({ select: { name: true } }),
    prisma.academicField.findMany({ select: { slug: true, updatedAt: true }, where: { verificationStatus: "VERIFIED" } }),
    prisma.major.findMany({ select: { slug: true, updatedAt: true }, where: { verificationStatus: "VERIFIED" } }),
  ]);
  const now = new Date();
  const staticPages = ["", "/universities", "/professors", "/research-areas", "/scholarship", "/pricing"].map((path) => ({
    url: `${SITE}${path || "/"}`,
    lastModified: now,
  }));
  return [
    ...staticPages,
    ...universities.map((row) => ({ url: `${SITE}/universities/${row.id}`, lastModified: row.updatedAt })),
    ...professors.map((row) => ({ url: `${SITE}/professors/${row.id}`, lastModified: row.updatedAt })),
    ...areas.map((row) => ({ url: `${SITE}/research-areas/${slugify(row.name)}`, lastModified: now })),
    ...fields.map((row) => ({ url: `${SITE}/fields/${row.slug}`, lastModified: row.updatedAt })),
    ...majors.map((row) => ({ url: `${SITE}/majors/${row.slug}`, lastModified: row.updatedAt })),
  ];
}
