import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeResearchMatch } from "@/lib/matching";

async function extractText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdf = await import("pdf-parse");
    const parsed = await pdf.default(buffer);
    return parsed.text || "";
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || "";
  }
  if (name.endsWith(".txt")) return buffer.toString("utf8");
  throw new Error("Upload a PDF, DOCX, or TXT file.");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to upload a resume." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a resume file." }, { status: 400 });
  if (file.size > 5_000_000) return NextResponse.json({ error: "File must be under 5 MB." }, { status: 400 });

  let resumeText = "";
  try {
    resumeText = (await extractText(file)).replace(/\s+/g, " ").trim();
  } catch {
    return NextResponse.json({ error: "Could not read that file. Upload a text-based PDF or DOCX." }, { status: 400 });
  }
  if (resumeText.length < 40) {
    return NextResponse.json({ error: "No usable text was found in that file. A scanned image PDF cannot be read." }, { status: 400 });
  }

  await prisma.student.update({ where: { id: student.id }, data: { resumeText: resumeText.slice(0, 8000) } });
  const professors = await prisma.professor.findMany({
    include: { university: true, researchAreas: { include: { researchArea: true } } },
  });
  const ranked = professors.map((p) => ({
    id: p.id,
    name: p.name,
    university: p.university.name,
    match: computeResearchMatch(
      { researchInterests: student.researchInterests, major: student.major, degree: student.degree, skills: student.skills, cvText: resumeText },
      { researchInterests: p.researchInterests, department: p.department, publications: p.publications, researchAreas: p.researchAreas.map((r) => ({ name: r.researchArea.name, keywords: r.researchArea.keywords })) }
    ),
  })).sort((a, b) => b.match.score - a.match.score);

  const isPro = student.plan === "pro";
  return NextResponse.json({
    plan: isPro ? "pro" : "free",
    preview: resumeText.slice(0, 400),
    shown: isPro ? ranked.length : 3,
    total: ranked.length,
    results: ranked.slice(0, isPro ? ranked.length : 3),
  });
}
