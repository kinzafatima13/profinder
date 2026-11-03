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

  await prisma.matchFeedback.create({
    data: {
      studentId: student?.id ?? null,
      query: typeof body.query === "string" ? body.query.slice(0, 500) : null,
      professorId: typeof body.professorId === "string" ? body.professorId : null,
      programId: typeof body.programId === "string" ? body.programId : null,
      universityId: typeof body.universityId === "string" ? body.universityId : null,
      vote,
      reason: typeof body.reason === "string" ? body.reason.slice(0, 120) : null,
    },
  });

  return NextResponse.json({ ok: true, stored: true, learning: false });
}
