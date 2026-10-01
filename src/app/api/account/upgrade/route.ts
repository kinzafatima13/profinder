import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Pro cannot be activated from the browser. Use Stripe checkout." },
    { status: 403 }
  );
}
