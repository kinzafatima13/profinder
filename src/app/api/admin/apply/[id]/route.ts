import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRequestStatus, logApplyActivity, requireFounder } from "@/lib/apply-admin";

const detail = {
  id: true,
  status: true,
  paymentStatus: true,
  paymentRef: true,
  paymentAt: true,
  feeCents: true,
  package: true,
  studentNote: true,
  founderNote: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      nationality: true,
      degree: true,
      major: true,
      currentUniversity: true,
      graduationYear: true,
      academicLevel: true,
      createdAt: true,
    },
  },
  items: {
    select: {
      id: true,
      status: true,
      preparationNote: true,
      studentApprovedAt: true,
      university: { select: { id: true, name: true, city: true, country: true, applicationUrl: true, applicationDeadline: true } },
    },
  },
  documents: {
    select: { id: true, kind: true, name: true, size: true, createdAt: true, storageProvider: true },
  },
  activities: { orderBy: { createdAt: "desc" as const }, take: 40 },
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const founder = await requireFounder();
  if (!founder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const request = await prisma.applyRequest.findUnique({ where: { id: params.id }, select: detail });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  await logApplyActivity(request.id, "founder_opened", founder.id);
  return NextResponse.json({ request });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const founder = await requireFounder();
  if (!founder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const current = await prisma.applyRequest.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!current) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: { status?: string; founderNote?: string } = {};
  if (typeof body.status === "string") {
    if (!isRequestStatus(body.status)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    data.status = body.status;
  }
  if (typeof body.founderNote === "string") data.founderNote = body.founderNote.slice(0, 4000);
  if (!data.status && data.founderNote === undefined) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const request = await prisma.applyRequest.update({ where: { id: current.id }, data, select: detail });
  if (data.status && data.status !== current.status) await logApplyActivity(current.id, "status_changed", founder.id, { from: current.status, to: data.status });
  if (data.founderNote !== undefined) await logApplyActivity(current.id, "founder_note", founder.id);
  return NextResponse.json({ request });
}
