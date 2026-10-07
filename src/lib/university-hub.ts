import { ensureSchema, prisma } from "@/lib/prisma";
import { slugify } from "@/lib/seo";

export const PROFESSOR_PREVIEW = 6;
export const PROGRAM_PREVIEW = 8;

export type UniversityHub = {
  university: {
    id: string;
    name: string;
    nameZh: string | null;
    country: string;
    city: string | null;
    province: string | null;
    officialUrl: string | null;
    sourceUrl: string | null;
    description: string | null;
    agencyNumber: string | null;
    dataStatus: string;
    dataSource: string | null;
    applicationUrl: string | null;
    scholarshipUrl: string | null;
  };
  counts: { programs: number; professors: number; scholarships: number };
  programs: {
    id: string;
    degree: string;
    major: string;
    teachingLang: string | null;
    deadline: string | null;
    programUrl: string | null;
    tuition: string | null;
  }[];
  professors: {
    id: string;
    name: string;
    nameZh: string | null;
    position: string | null;
    department: string | null;
    researchInterests: string | null;
    email: string | null;
    dataStatus: string;
    researchAreas: string[];
  }[];
  scholarships: {
    id: string;
    name: string;
    type: string | null;
    deadline: string | null;
    officialUrl: string | null;
    requirements: string | null;
  }[];
  researchAreas: string[];
  sectionErrors: string[];
};

async function safe<T>(label: string, errors: string[], fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[university-hub] ${label} failed`, error);
    errors.push(label);
    return fallback;
  }
}

export async function resolveUniversityParam(param: string) {
  await ensureSchema();
  const id = decodeURIComponent(param);
  const direct = await prisma.university.findUnique({ where: { id }, select: { id: true } });
  if (direct) return { id: direct.id, canonicalRedirect: false };

  const slug = slugify(id);
  if (!slug) return null;
  const rows = await prisma.university.findMany({ select: { id: true, name: true } });
  const matches = rows.filter((row) => slugify(row.name) === slug);
  if (matches.length !== 1) return null;
  return { id: matches[0].id, canonicalRedirect: true };
}

export async function loadUniversityHub(id: string): Promise<UniversityHub | null> {
  await ensureSchema();
  const university = await prisma.university.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nameZh: true,
      country: true,
      city: true,
      province: true,
      officialUrl: true,
      sourceUrl: true,
      description: true,
      agencyNumber: true,
      dataStatus: true,
      dataSource: true,
      applicationUrl: true,
      scholarshipUrl: true,
    },
  });
  if (!university) return null;

  const sectionErrors: string[] = [];
  const [programCount, professorCount, scholarshipCount, programs, professors, scholarships, areaRows] = await Promise.all([
    safe("program count", sectionErrors, 0, () => prisma.program.count({ where: { universityId: id } })),
    safe("professor count", sectionErrors, 0, () => prisma.professor.count({ where: { universityId: id } })),
    safe("scholarship count", sectionErrors, 0, () => prisma.scholarship.count({ where: { universityId: id } })),
    safe("programs", sectionErrors, [], () =>
      prisma.program.findMany({
        where: { universityId: id },
        select: { id: true, degree: true, major: true, teachingLang: true, deadline: true, programUrl: true, tuition: true },
        orderBy: [{ degree: "asc" }, { major: "asc" }],
        take: PROGRAM_PREVIEW,
      }),
    ),
    safe("professors", sectionErrors, [], () =>
      prisma.professor.findMany({
        where: { universityId: id },
        select: {
          id: true,
          name: true,
          nameZh: true,
          position: true,
          department: true,
          researchInterests: true,
          email: true,
          dataStatus: true,
          researchAreas: { select: { researchArea: { select: { name: true } } }, take: 4 },
        },
        orderBy: [{ dataStatus: "desc" }, { name: "asc" }],
        take: PROFESSOR_PREVIEW,
      }),
    ),
    safe("funding", sectionErrors, [], () =>
      prisma.scholarship.findMany({
        where: { universityId: id },
        select: { id: true, name: true, type: true, deadline: true, officialUrl: true, requirements: true },
        orderBy: { name: "asc" },
        take: 12,
      }),
    ),
    safe("research areas", sectionErrors, [], () =>
      prisma.researchArea.findMany({
        where: { professors: { some: { professor: { universityId: id } } } },
        select: { name: true },
        orderBy: { name: "asc" },
        take: 12,
      }),
    ),
  ]);

  return {
    university,
    counts: { programs: programCount, professors: professorCount, scholarships: scholarshipCount },
    programs,
    professors: professors.map((professor) => ({
      id: professor.id,
      name: professor.name,
      nameZh: professor.nameZh,
      position: professor.position,
      department: professor.department,
      researchInterests: professor.researchInterests,
      email: professor.email,
      dataStatus: professor.dataStatus,
      researchAreas: professor.researchAreas.map((row) => row.researchArea.name),
    })),
    scholarships,
    researchAreas: areaRows.map((row) => row.name),
    sectionErrors,
  };
}
