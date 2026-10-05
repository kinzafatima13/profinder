import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { priceIdFor, stripeClient, stripeConfigured } from "@/lib/billing/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const plan = body.plan === "PRO_ANNUAL" ? "PRO_ANNUAL" : body.plan === "PRO_MONTHLY" ? "PRO_MONTHLY" : "";
  if (!plan) return NextResponse.json({ error: "Choose Pro monthly or Pro annual." }, { status: 400 });
  if (!stripeConfigured() || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured. Pro is not activated until a real checkout succeeds." }, { status: 503 });
  }

  const origin = process.env.NEXTAUTH_URL || "https://www.profindernow.com";
  const client = await stripeClient();
  const checkout = await client.checkout.sessions.create({
    mode: "subscription",
    customer_email: student.email,
    client_reference_id: student.id,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    metadata: { studentId: student.id, plan },
    subscription_data: { metadata: { studentId: student.id, plan } },
  });
  return NextResponse.json({ url: checkout.url });
}
