import { PrismaClient, Professor, University, Publication } from "@prisma/client";
import { normalizeName } from "../normalize";

export async function findUniversityDuplicate(
  prisma: PrismaClient,
  uni: { name: string; openAlexId?: string | null }
): Promise<University | null> {
  if (uni.openAlexId) {
    const byOpenAlex = await prisma.university.findFirst({
      where: { openAlexId: uni.openAlexId },
    });
    if (byOpenAlex) return byOpenAlex;
  }

  // Exact name
  const byName = await prisma.university.findFirst({
    where: { name: uni.name },
  });
  if (byName) return byName;

  // Case insensitive match
  const allUnis = await prisma.university.findMany({
    select: { id: true, name: true },
  });
  const targetNorm = uni.name.trim().toLowerCase();
  const matched = allUnis.find((u) => u.name.trim().toLowerCase() === targetNorm);
  if (matched) {
    return prisma.university.findUnique({ where: { id: matched.id } });
  }

  return null;
}

export async function findProfessorDuplicate(
  prisma: PrismaClient,
  universityId: string,
  prof: {
    name: string;
    orcid?: string | null;
    openAlexId?: string | null;
    semanticScholarId?: string | null;
    email?: string | null;
  }
): Promise<Professor | null> {
  // 1. By ORCID (unique across the world)
  if (prof.orcid) {
    const byOrcid = await prisma.professor.findFirst({
      where: { orcid: prof.orcid },
    });
    if (byOrcid) return byOrcid;
  }

  // 2. By OpenAlex ID
  if (prof.openAlexId) {
    const byOpenAlex = await prisma.professor.findFirst({
      where: { openAlexId: prof.openAlexId },
    });
    if (byOpenAlex) return byOpenAlex;
  }

  // 3. By Semantic Scholar ID
  if (prof.semanticScholarId) {
    const byS2 = await prisma.professor.findFirst({
      where: { semanticScholarId: prof.semanticScholarId },
    });
    if (byS2) return byS2;
  }

  // 4. By University + Email
  if (prof.email) {
    const byEmail = await prisma.professor.findFirst({
      where: { universityId, email: prof.email.trim().toLowerCase() },
    });
    if (byEmail) return byEmail;
  }

  // 5. By University + Normalized Name
  const targetNorm = normalizeName(prof.name);
  if (!targetNorm) return null;

  const sameUniProfs = await prisma.professor.findMany({
    where: { universityId },
    select: { id: true, name: true },
  });

  const matched = sameUniProfs.find((p) => normalizeName(p.name) === targetNorm);
  if (matched) {
    return prisma.professor.findUnique({ where: { id: matched.id } });
  }

  return null;
}

export async function findPublicationDuplicate(
  prisma: PrismaClient,
  professorId: string,
  pub: {
    doi?: string | null;
    openAlexWorkId?: string | null;
    semanticScholarPaperId?: string | null;
    title: string;
  }
): Promise<Publication | null> {
  // 1. By DOI
  if (pub.doi) {
    const cleanDoi = pub.doi.trim().toLowerCase();
    const byDoi = await prisma.publication.findFirst({
      where: { professorId, doi: cleanDoi },
    });
    if (byDoi) return byDoi;
  }

  // 2. By OpenAlex Work ID
  if (pub.openAlexWorkId) {
    const byOpenAlex = await prisma.publication.findFirst({
      where: { professorId, openAlexWorkId: pub.openAlexWorkId },
    });
    if (byOpenAlex) return byOpenAlex;
  }

  // 3. By Semantic Scholar Paper ID
  if (pub.semanticScholarPaperId) {
    const byS2 = await prisma.publication.findFirst({
      where: { professorId, semanticScholarPaperId: pub.semanticScholarPaperId },
    });
    if (byS2) return byS2;
  }

  // 4. By normalized title match for the same professor
  const normTitle = pub.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normTitle) return null;

  const profPubs = await prisma.publication.findMany({
    where: { professorId },
    select: { id: true, title: true },
  });

  const matched = profPubs.find(
    (p) => p.title.toLowerCase().replace(/[^a-z0-9]/g, "") === normTitle
  );
  if (matched) {
    return prisma.publication.findUnique({ where: { id: matched.id } });
  }

  return null;
}
