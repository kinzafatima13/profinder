import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logApplyActivity, publicRequest } from "@/lib/apply-admin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const request = await prisma.applyRequest.findFirst({
    where: { id: params.id, studentId: student.id },
    include: { documents: true, items: true },
  });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.documents.length < 1) return NextResponse.json({ error: "Upload at least one document first." }, { status: 400 });
  if (request.paymentStatus === "paid") return NextResponse.json({ request });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Checkout is not configured. The package fee is not charged until Stripe is available." }, { status: 503 });
  }

  const origin = process.env.NEXTAUTH_URL || "https://www.profindernow.com";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: student.email,
    client_reference_id: student.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: request.feeCents,
        product_data: { name: `Apply for Me — ${request.items.length} applications` },
      },
    }],
    success_url: `${origin}/apply?request=${request.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/apply?request=${request.id}&checkout=cancelled`,
    metadata: { studentId: student.id, applyRequestId: request.id, service: "apply_for_me" },
  });
  return NextResponse.json({ url: checkout.url });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "No paid checkout to confirm." }, { status: 400 });
  const request = await prisma.applyRequest.findFirst({ where: { id: params.id, studentId: student.id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const checkout = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkout.metadata?.applyRequestId !== request.id || checkout.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment is not confirmed for this request." }, { status: 402 });
  }
  const updated = await prisma.applyRequest.update({
    where: { id: request.id },
    data: {
      paymentStatus: "paid",
      paymentRef: checkout.id,
      paymentAt: request.paymentStatus === "paid" ? undefined : new Date(),
      status: request.status === "needs_action" ? "needs_action" : "preparing",
    },
  });
  await prisma.applyRequestItem.updateMany({ where: { requestId: request.id, status: "selected" }, data: { status: "preparing" } });
  if (request.paymentStatus !== "paid") await logApplyActivity(request.id, "payment_received", student.id);
  return NextResponse.json({ request: publicRequest(updated) });
}
