import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APPLY_PACKAGES, quoteApply } from "@/lib/apply-packages";

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
  return NextResponse.json({ requests, packages: APPLY_PACKAGES });
}

export async function POST(req: NextRequest) {
  const student = await studentFromSession();
  if (!student) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const universityIds: string[] = Array.isArray(body.universityIds)
    ? body.universityIds.map((value: unknown) => String(value)).filter((value: string) => value.length > 0).filter((value: string, index: number, all: string[]) => all.indexOf(value) === index)
    : [];
  const studentNote = typeof body.studentNote === "string" ? body.studentNote.slice(0, 2000) : "";
  const quote = quoteApply(String(body.packageId || ""), Number(body.customCount || 0));
  if (!quote) return NextResponse.json({ error: "Choose the $30 offer, five applications, or a custom count from 6 to 12." }, { status: 400 });
  if (universityIds.length !== quote.applications) {
    return NextResponse.json({ error: `This package needs exactly ${quote.applications} stored universities.` }, { status: 400 });
  }
  const universities = await prisma.university.findMany({ where: { id: { in: universityIds } }, select: { id: true } });
  if (universities.length !== universityIds.length) {
    return NextResponse.json({ error: "One or more universities are not stored." }, { status: 400 });
  }
  try {
    const created = await prisma.applyRequest.create({
      data: {
        studentId: student.id,
        status: "draft",
        feeCents: quote.feeCents,
        package: quote.packageId,
        paymentStatus: "unpaid",
        studentNote,
        items: { create: universityIds.map((universityId) => ({ universityId, status: "selected" })) },
      },
      include: { items: { include: { university: { select: { id: true, name: true, city: true, country: true } } } } },
    });
    return NextResponse.json({ request: created });
  } catch {
    return NextResponse.json({ error: "The request could not be saved. Academic records were not changed." }, { status: 500 });
  }
}

