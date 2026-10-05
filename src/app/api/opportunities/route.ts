import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreProgram, scoreScholarship, type FitProfile } from "@/lib/eligibility";

export async function GET() {
  const session = await getServerSession(authOptions);
  const student = session?.user?.email
    ? await prisma.student.findUnique({ where: { email: session.user.email } })
    : null;

  const profile: FitProfile = {
    degree: student?.degree,
    major: student?.major,
    interests: student?.researchInterests,
    gpa: student?.gpa,
    preferredUniversities: student?.preferredUniversities,
    preferredCountries: student?.preferredCountries,
  };
  const ready = Boolean(profile.degree || profile.major || profile.interests);

  const [programs, scholarships] = await Promise.all([
    prisma.program.findMany({
      include: { university: { select: { id: true, name: true, city: true } } },
    }),
    prisma.scholarship.findMany({
      include: { university: { select: { name: true } } },
    }),
  ]);

  const rankedPrograms = programs
    .map((program) => {
      const fit = ready
        ? scoreProgram(profile, {
            degree: program.degree,
            major: program.major,
            universityName: program.university.name,
            deadline: program.deadline,
            gpaRequirement: program.gpaRequirement,
            englishReq: program.englishReq,
          })
        : null;
      return {
        id: program.id,
        universityId: program.university.id,
        university: program.university.name,
        city: program.university.city,
        degree: program.degree,
        major: program.major,
        deadline: program.deadline,
        score: fit?.score ?? null,
        reasons: fit?.reasons ?? [],
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8);

  const seen = new Set<string>();
  const rankedScholarships = scholarships
    .filter((row) => {
      const key = `${row.universityId ?? "none"}:${row.type ?? row.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((row) => {
      const fit = ready
        ? scoreScholarship(profile, {
            name: row.name,
            type: row.type,
            universityName: row.university?.name,
            deadline: row.deadline,
          })
        : null;
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        university: row.university?.name ?? "University not linked",
        deadline: row.deadline,
        officialUrl: row.officialUrl,
        score: fit?.score ?? null,
        reasons: fit?.reasons ?? [],
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8);

  return NextResponse.json({
    signedIn: Boolean(student),
    profileReady: ready,
    programs: rankedPrograms,
    scholarships: rankedScholarships,
  });
}
