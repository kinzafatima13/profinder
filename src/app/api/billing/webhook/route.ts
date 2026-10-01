import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }
  const stripe = await import("stripe");
  const client = new stripe.default(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  let event;
  try {
    event = client.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const email = event.data.object.customer_email || event.data.object.metadata?.email;
    if (email) {
      await prisma.student.update({ where: { email }, data: { plan: "pro" } }).catch(() => null);
    }
  }
  return NextResponse.json({ received: true });
}
