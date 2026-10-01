import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function admin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase());
  if (!student || (student.role !== "admin" && !allow.includes(student.email.toLowerCase()))) return null;
  return student;
}

export async function GET() {
  if (!await admin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pending = await prisma.student.findMany({
    where: { plan: { startsWith: "pending:" } },
    select: { id: true, email: true, name: true, plan: true },
  });
  return NextResponse.json({ pending });
}

export async function POST(req: NextRequest) {
  if (!await admin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body.id || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }
  const student = await prisma.student.findUnique({ where: { id: body.id } });
  if (!student?.plan.startsWith("pending:")) return NextResponse.json({ error: "No pending payment" }, { status: 404 });
  await prisma.student.update({
    where: { id: student.id },
    data: { plan: body.action === "approve" ? "pro" : "free" },
  });
  return NextResponse.json({ ok: true });
}
