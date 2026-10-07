import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureSchema, prisma } from "@/lib/prisma";
import { focusTokens, labelTerm, professorQueryWhere } from "@/lib/discovery";
import { parseDocuments } from "@/lib/application-plan";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(requestKey(req, "assistant"), 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many questions. Try again in a few minutes." }, { status: 429 });
  }
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 3 || question.length > 400) {
    return NextResponse.json({ error: "Ask what you want to study, in a short sentence." }, { status: 400 });
  }

  const tokens = focusTokens(question);
  const session = await getServerSession(authOptions);
  const [professors, programs, universities, areas, topics, scholarships] = await Promise.all([
    prisma.professor.findMany({
      where: professorQueryWhere(question),
      select: {
        id: true,
        name: true,
        department: true,
        researchInterests: true,
        dataStatus: true,
        university: { select: { name: true } },
        researchAreas: { select: { researchArea: { select: { name: true } } }, take: 3 },
      },
      take: 6,
    }),
    prisma.program.findMany({
      where: tokens.length >= 2
        ? { AND: tokens.map((token) => ({ OR: [{ major: { contains: labelTerm(token) } }, { degree: { contains: labelTerm(token) } }] })) }
        : { OR: [{ major: { contains: labelTerm(tokens[0] || question) } }, { degree: { contains: labelTerm(tokens[0] || question) } }] },
      select: { degree: true, major: true, university: { select: { id: true, name: true } } },
      take: 4,
    }),
    prisma.university.findMany({
      where: { OR: [{ name: { contains: question } }, { city: { contains: question } }] },
      select: { id: true, name: true, city: true, country: true },
      take: 4,
    }),
    prisma.researchArea.findMany({
      where: tokens.length >= 2
        ? { AND: tokens.map((token) => ({ name: { contains: labelTerm(token) } })) }
        : { name: { contains: labelTerm(tokens[0] || question) } },
      select: { name: true },
      take: 6,
    }),
    prisma.topic.findMany({
      where: tokens.length >= 2
        ? { AND: tokens.map((token) => ({ name: { contains: labelTerm(token) } })) }
        : { name: { contains: labelTerm(tokens[0] || question) } },
      select: { name: true },
      take: 4,
    }),
    prisma.scholarship.findMany({
      where: tokens.length >= 2
        ? { AND: tokens.map((token) => ({ OR: [{ name: { contains: labelTerm(token) } }, { requirements: { contains: labelTerm(token) } }, { type: { contains: labelTerm(token) } }] })) }
        : { OR: [{ name: { contains: labelTerm(tokens[0] || question) } }, { type: { contains: labelTerm(tokens[0] || question) } }] },
      select: { id: true, name: true, type: true, university: { select: { name: true } } },
      take: 3,
    }),
  ]);

  const directions = [
    ...areas.map((row) => ({ label: row.name, href: "/professors?area=" + encodeURIComponent(row.name) })),
    ...topics
      .filter((row) => !areas.some((area) => area.name.toLowerCase() === row.name.toLowerCase()))
      .map((row) => ({ label: row.name, href: "/professors?q=" + encodeURIComponent(row.name) })),
  ].slice(0, 6);

  const limited = professors.length === 0 && programs.length === 0 && universities.length === 0;
  const understanding = limited
    ? `Nothing stored matches “${question}” closely. ProFinder’s programs are currently computer science and related majors. Some professor records mention other subjects in their stored interests or topics, but this wording did not match those records.`
    : `These are stored ProFinder records that share words with “${question}”. A match is not proof that a professor supervises that exact project, and it is not an admissions decision.`;

  let tracker: string | undefined;
  if (/document|passport|checklist|transcript|deadline|my application|saved/.test(question.toLowerCase())) {
    if (!session?.user?.email) {
      tracker = "Sign in to check documents and deadlines on your own saved applications.";
    } else {
      const student = await prisma.student.findUnique({ where: { email: session.user.email } });
      const apps = student
        ? await prisma.application.findMany({
            where: { studentId: student.id },
            include: { professor: { include: { university: true } } },
            orderBy: { updatedAt: "desc" },
            take: 8,
          })
        : [];
      if (!apps.length) tracker = "No application is saved on your tracker yet.";
      else {
        const missing = apps.reduce((sum, row) => sum + Object.values(parseDocuments(row.documentsJson)).filter((item) => item === "missing").length, 0);
        tracker = `${apps.length} saved application${apps.length === 1 ? "" : "s"}. ${missing} document marks are still missing. Deadline notes are unverified.`;
      }
    }
  }

  return NextResponse.json({
    understanding,
    limited,
    directions,
    professors: professors.map((row) => ({
      id: row.id,
      name: row.name,
      university: row.university.name,
      department: row.department,
      interests: row.researchInterests,
      areas: row.researchAreas.map((item) => item.researchArea.name),
      verified: row.dataStatus === "verified",
    })),
    programs: programs.map((row) => ({
      label: `${row.degree} · ${row.major}`,
      university: row.university.name,
      href: `/universities/${row.university.id}#programs`,
    })),
    universities: universities.map((row) => ({
      id: row.id,
      name: row.name,
      place: [row.city, row.country].filter(Boolean).join(", "),
    })),
    funding: scholarships.map((row) => ({
      name: row.name,
      type: row.type,
      university: row.university?.name || "University not linked",
      href: "/scholarship",
    })),
    tracker,
    explore: {
      professors: "/professors?q=" + encodeURIComponent(question),
      programs: "/programs?q=" + encodeURIComponent(tokens[0] || question),
      match: "/find",
    },
  });
}
