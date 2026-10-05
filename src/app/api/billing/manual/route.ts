import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Manual payment is closed. Pro starts only after Stripe checkout and the webhook." }, { status: 410 });
}
