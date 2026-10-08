import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const request = await prisma.applyRequest.findFirst({
    where: { id: params.id, studentId: student.id },
    include: { items: true },
  });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.paymentStatus !== "paid") return NextResponse.json({ error: "Payment is required before review." }, { status: 402 });

  const body = await req.json().catch(() => ({}));
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const item = request.items.find((row) => row.id === itemId);
  if (!item) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (item.status !== "ready_for_review") {
    return NextResponse.json({ error: "This application is not ready for your approval yet." }, { status: 409 });
  }

  await prisma.applyRequestItem.update({
    where: { id: item.id },
    data: { status: "approved", studentApprovedAt: new Date() },
  });
  const items = await prisma.applyRequestItem.findMany({ where: { requestId: request.id } });
  const allApproved = items.every((row) => row.status === "approved");
  if (allApproved) {
    await prisma.applyRequest.update({ where: { id: request.id }, data: { status: "submit_requested" } });
  }
  return NextResponse.json({
    approved: true,
    submitted: false,
    status: allApproved ? "submit_requested" : "ready_for_review",
    note: "Approval records your consent. ProFinder does not submit to a university portal until the application team acts on this approval.",
  });
}
