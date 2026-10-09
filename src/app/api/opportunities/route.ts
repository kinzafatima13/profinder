import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureSchema, prisma } from "@/lib/prisma";
import { scoreProgram, scoreScholarship, type FitProfile } from "@/lib/eligibility";

const PROGRAM_CAP = 400;
const SCHOLARSHIP_CAP = 400;

/** Prefer a spread of universities so anonymous visitors see real variety, not one batch. */
function diversifyByUniversity<T extends { university: string }>(rows: T[], limit: number): T[] {
  const picked: T[] = [];
  const seenUni = new Set<string>();
  // First pass: one per university
  for (const row of rows) {
    if (picked.length >= limit) break;
    const key = row.university.toLowerCase();
    if (seenUni.has(key)) continue;
    seenUni.add(key);
    picked.push(row);
  }
  // Second pass: fill remaining slots
  for (const row of rows) {
    if (picked.length >= limit) break;
    if (picked.includes(row)) continue;
    picked.push(row);
  }
  return picked;
}

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
      orderBy: [{ university: { name: "asc" } }, { major: "asc" }],
      take: PROGRAM_CAP,
    }),
    prisma.scholarship.findMany({
      include: { university: { select: { name: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      take: SCHOLARSHIP_CAP,
    }),
  ]);

  const mappedPrograms = programs.map((program) => {
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
      funding: "UNKNOWN" as const,
      score: fit?.score ?? null,
      reasons: fit?.reasons ?? [],
    };
  });

  const rankedPrograms = ready
    ? mappedPrograms.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 8)
    : diversifyByUniversity(mappedPrograms, 8);

  const seen = new Set<string>();
  const mappedScholarships = scholarships
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
    });

  const rankedScholarships = ready
    ? mappedScholarships.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 8)
    : diversifyByUniversity(mappedScholarships, 8);

  const sampled = programTotal > programs.length || scholarshipTotal > scholarships.length;

  return NextResponse.json({
    signedIn: Boolean(student),
    profileReady: ready,
    sampled,
    sampleNote: sampled
      ? "Listing uses stored records (up to 400 programs and 400 scholarships). It is not a score of every award in China."
      : null,
    programs: rankedPrograms,
    scholarships: rankedScholarships,
  });
}
