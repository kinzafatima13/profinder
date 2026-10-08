import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student || student.role !== "admin") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : "";
  const status = body.status === "needs_action" ? "needs_action" : "ready_for_review";
  const item = await prisma.applyRequestItem.findFirst({ where: { id: itemId, requestId: params.id } });
  if (!item) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  await prisma.applyRequestItem.update({ where: { id: item.id }, data: { status, preparationNote: note } });
  await prisma.applyRequest.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ ok: true });
}
