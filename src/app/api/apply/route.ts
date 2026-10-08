import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FEE_CENTS = 3000;
const MAX_UNIVERSITIES = 3;

async function studentFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.student.findUnique({ where: { email: session.user.email } });
}

export async function GET() {
  const student = await studentFromSession();
  if (!student) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const requests = await prisma.applyRequest.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { university: { select: { id: true, name: true, city: true, country: true } } } },
      documents: { select: { id: true, kind: true, name: true, size: true, createdAt: true } },
    },
  });
  return NextResponse.json({ requests, feeCents: FEE_CENTS, maxUniversities: MAX_UNIVERSITIES });
}

export async function POST(req: NextRequest) {
  const student = await studentFromSession();
  if (!student) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const universityIds: string[] = Array.isArray(body.universityIds)
    ? body.universityIds.map((value: unknown) => String(value)).filter((value: string) => value.length > 0).filter((value: string, index: number, all: string[]) => all.indexOf(value) === index)
    : [];
  const studentNote = typeof body.studentNote === "string" ? body.studentNote.slice(0, 2000) : "";
  if (universityIds.length < 1 || universityIds.length > MAX_UNIVERSITIES) {
    return NextResponse.json({ error: "Choose 1 to 3 stored universities." }, { status: 400 });
  }
  const universities = await prisma.university.findMany({ where: { id: { in: universityIds } }, select: { id: true } });
  if (universities.length !== universityIds.length) {
    return NextResponse.json({ error: "One or more universities are not stored." }, { status: 400 });
  }
  const created = await prisma.applyRequest.create({
    data: {
      studentId: student.id,
      status: "draft",
      feeCents: FEE_CENTS,
      paymentStatus: "unpaid",
      studentNote,
      items: { create: universityIds.map((universityId) => ({ universityId, status: "selected" })) },
    },
    include: { items: { include: { university: { select: { id: true, name: true, city: true, country: true } } } } },
  });
  return NextResponse.json({ request: created });
}
