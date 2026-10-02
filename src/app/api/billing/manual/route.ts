import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const method = String(body.method || "bank");
  const tier = ["pro-monthly", "premium-monthly", "premium-yearly"].includes(body.tier) ? body.tier : "pro-monthly";
  const reference = String(body.reference || "").trim();
  if (reference.length < 4) {
    return NextResponse.json({ error: "Enter the payment reference from JazzCash, EasyPaisa, or your bank transfer." }, { status: 400 });
  }

  await prisma.student.update({
    where: { id: student.id },
    data: { plan: `pending:${method}:${tier}:${reference}`.slice(0, 180) },
  });
  return NextResponse.json({
    status: "pending",
    message: "Payment submitted for review. Pro starts only after an admin confirms the money arrived.",
  });
}
