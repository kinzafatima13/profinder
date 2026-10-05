import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/billing/stripe";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email }, include: { subscription: true } });
  if (!student?.subscription?.providerCustomerId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "No Stripe customer is stored for this account yet." }, { status: 400 });
  }
  const origin = process.env.NEXTAUTH_URL || "https://www.profindernow.com";
  const client = await stripeClient();
  const portal = await client.billingPortal.sessions.create({
    customer: student.subscription.providerCustomerId,
    return_url: `${origin}/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
