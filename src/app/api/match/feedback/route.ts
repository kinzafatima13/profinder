import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureSchema, prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  await ensureSchema();
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));
  const vote = body.vote === "down" ? "down" : body.vote === "up" ? "up" : "";
  if (!vote) return NextResponse.json({ error: "Vote is required." }, { status: 400 });
  const student = session?.user?.email
    ? await prisma.student.findUnique({ where: { email: session.user.email } })
    : null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "MatchFeedback" ("id", "studentId", "query", "professorId", "programId", "universityId", "vote", "reason", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    student?.id || null,
    typeof body.query === "string" ? body.query.slice(0, 500) : null,
    typeof body.professorId === "string" ? body.professorId : null,
    typeof body.programId === "string" ? body.programId : null,
    typeof body.universityId === "string" ? body.universityId : null,
    vote,
    typeof body.reason === "string" ? body.reason.slice(0, 120) : null
  );
  return NextResponse.json({ ok: true, stored: true, learning: false });
}
