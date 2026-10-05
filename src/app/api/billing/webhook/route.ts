import { NextRequest, NextResponse } from "next/server";
import { applyStripeEvent, stripeClient } from "@/lib/billing/stripe";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const client = await stripeClient();
  let event;
  try {
    event = client.webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const result = await applyStripeEvent(event, client);
  return NextResponse.json({ received: true, duplicate: result.duplicate });
}
