import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureSchema, prisma } from "@/lib/prisma";
import { scoreProgram, scoreScholarship, type FitProfile } from "@/lib/eligibility";

const PROGRAM_CAP = 400;
const SCHOLARSHIP_CAP = 400;

export async function GET() {
  await ensureSchema();
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

  const [programTotal, scholarshipTotal, programs, scholarships] = await Promise.all([
    prisma.program.count(),
    prisma.scholarship.count(),
    prisma.program.findMany({
      include: { university: { select: { id: true, name: true, city: true } } },
      orderBy: { updatedAt: "desc" },
      take: PROGRAM_CAP,
    }),
    prisma.scholarship.findMany({
      include: { university: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: SCHOLARSHIP_CAP,
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
        funding: "UNKNOWN",
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
        fundingCoverage: row.type && /full/i.test(row.type) ? "CHECK_SOURCE" : "UNKNOWN",
        score: fit?.score ?? null,
        reasons: fit?.reasons ?? [],
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8);

  const sampled = programTotal > programs.length || scholarshipTotal > scholarships.length;

  return NextResponse.json({
    signedIn: Boolean(student),
    profileReady: ready,
    sampled,
    sampleNote: sampled
      ? "Ranking uses the most recently updated stored records, up to 400 programs and 400 scholarships. It is not a score of the entire catalog."
      : null,
    programs: rankedPrograms,
    scholarships: rankedScholarships,
  });
}
