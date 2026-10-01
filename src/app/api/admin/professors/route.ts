import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase());
  if (!student || (student.role !== "admin" && !allow.includes(student.email.toLowerCase()))) return null;
  return student;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const professors = await prisma.professor.findMany({
    include: { university: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  return NextResponse.json({
    professors: professors.map((p) => ({
      id: p.id,
      name: p.name,
      university: p.university.name,
      dataStatus: p.dataStatus,
      verifiedAt: p.verifiedAt,
      profileIsPersonal: p.profileIsPersonal,
    })),
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const allowed = ["verified", "unverified", "needs_review", "outdated"];
  if (!body.id || !allowed.includes(body.dataStatus)) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }
  const updated = await prisma.professor.update({
    where: { id: body.id },
    data: {
      dataStatus: body.dataStatus,
      verifiedAt: body.dataStatus === "verified" ? new Date() : undefined,
    },
  });
  return NextResponse.json({ id: updated.id, dataStatus: updated.dataStatus });
}
