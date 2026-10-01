import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.json(
      { error: "Payments are not configured. Pro is not granted until Stripe checkout succeeds." },
      { status: 503 }
    );
  }

  const stripe = await import("stripe");
  const client = new stripe.default(process.env.STRIPE_SECRET_KEY);
  const checkout = await client.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/pricing?status=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?status=cancelled`,
    metadata: { email: session.user.email },
  });
  return NextResponse.json({ url: checkout.url });
}
