import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDocuments } from "@/lib/application-plan";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to use the assistant." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 3) return NextResponse.json({ error: "Ask a question about your saved applications." }, { status: 400 });

  const apps = await prisma.application.findMany({
    where: { studentId: student.id },
    include: { professor: { include: { university: true } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const q = question.toLowerCase();
  const lines: string[] = [];

  if (/document|passport|checklist|transcript|cv/.test(q)) {
    const missing = apps.reduce((sum, row) => sum + Object.values(parseDocuments(row.documentsJson)).filter((item) => item === "missing").length, 0);
    lines.push(apps.length ? `${missing} document marks are still missing across ${apps.length} saved application${apps.length === 1 ? "" : "s"}. The list is common materials, not an official university list.` : "No application is saved, so there is no document checklist yet.");
  }

  if (/deadline|when|date/.test(q)) {
    const notes = apps.map((row) => row.deadline).filter(Boolean);
    lines.push(notes.length ? `Saved deadline notes: ${notes.join("; ")}. None of these are verified official dates, so there is no countdown.` : "No deadline note is saved. Stored university dates are unverified, so no countdown is available.");
  }

  if (/fund|scholarship/.test(q)) {
    lines.push("Funding evidence for professors is unknown. Scholarship records are unverified labels, not confirmed awards.");
  }

  if (/professor|email|university|progress|status|next/.test(q) || lines.length === 0) {
    if (!apps.length) {
      lines.push("Nothing is saved on the tracker yet. Save a professor or scholarship first.");
    } else {
      lines.push(apps.slice(0, 5).map((row) => {
        const name = row.professor?.name || row.programName || "Saved item";
        const school = row.professor?.university?.name || "university not linked";
        return `${name} at ${school}: status ${row.status}. ${row.professor?.email ? `Email on file: ${row.professor.email}.` : "No professor email is stored."}`;
      }).join(" "));
    }
  }

  lines.push(`Profile on file: ${student.degree || "degree missing"}, ${student.major || "major missing"}, English ${student.englishTest?.trim() || "not saved"}.`);
  lines.push("This answer uses only your saved records. It does not search the web and it does not send email.");

  return NextResponse.json({
    answer: lines.join(" "),
    sources: apps.slice(0, 5).map((row) => ({
      label: row.professor?.name || row.programName || "Saved item",
      href: row.professor ? `/professors/${row.professor.id}` : "/tracker",
    })),
  });
}
