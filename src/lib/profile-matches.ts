import { prisma } from "@/lib/prisma";
import { computeResearchMatch } from "@/lib/matching";
import { scoreScholarship } from "@/lib/eligibility";

type StudentBits = {
  id: string;
  degree?: string | null;
  major?: string | null;
  researchInterests?: string | null;
  skills?: string | null;
  academicBackground?: string | null;
  projects?: string | null;
  cvText?: string | null;
  gpa?: string | null;
  preferredCountries?: string | null;
  preferredUniversities?: string | null;
  nationality?: string | null;
  fundingGoals?: string | null;
};

function words(value: string | null | undefined) {
  return [...new Set((value || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3))].slice(0, 3);
}

export async function topProfessorMatches(student: StudentBits, limit = 3) {
  const tokens = words(student.researchInterests);
  if (!tokens.length) return [];
  const professors = await prisma.professor.findMany({
    where: { OR: tokens.map((token) => ({ researchInterests: { contains: token } })) },
    include: { university: true, researchAreas: { include: { researchArea: true } } },
    take: 40,
  });
  return professors
    .map((professor) => ({
      id: professor.id,
      name: professor.name,
      university: professor.university.name,
      verified: professor.dataStatus === "verified",
      createdAt: professor.createdAt,
      updatedAt: professor.updatedAt,
      match: computeResearchMatch(
        {
          researchInterests: student.researchInterests,
          major: student.major,
          degree: student.degree,
          skills: student.skills,
          academicBackground: student.academicBackground,
          projects: student.projects,
          cvText: student.cvText,
        },
        {
          researchInterests: professor.researchInterests,
          department: professor.department,
          publications: professor.publications,
          researchAreas: professor.researchAreas.map((area) => ({
            name: area.researchArea.name,
            keywords: area.researchArea.keywords,
          })),
        }
      ),
    }))
    .filter((row) => !row.match.incomplete && row.match.score >= 15)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

export async function topScholarshipMatches(student: StudentBits, limit = 3) {
  const scholarships = await prisma.scholarship.findMany({
    include: { university: { select: { name: true } } },
    take: 40,
  });
  const seen = new Set<string>();
  return scholarships
    .filter((row) => {
      const key = `${row.type}:${row.universityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      university: row.university?.name || "University not linked",
      fit: scoreScholarship(
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
      ),
    }))
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, limit);
}
