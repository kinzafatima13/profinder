import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const code = String(body.code || "").trim();
  const password = String(body.password || "");
  if (!email || !/^\d{6}$/.test(code) || password.length < 6) {
    return NextResponse.json({ error: "Email, 6-digit code, and a new password are required." }, { status: 400 });
  }
  if (!rateLimit(`reset:${email}`, 8, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many reset attempts. Try again later." }, { status: 429 });
  }

  const student = await prisma.student.findUnique({ where: { email } });
  const hash = crypto.createHash("sha256").update(code).digest("hex");
  if (!student || student.resetToken !== hash || !student.resetTokenExp || student.resetTokenExp < new Date()) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 });
  }

  await prisma.student.update({
    where: { id: student.id },
    data: { passwordHash: await bcrypt.hash(password, 12), resetToken: null, resetTokenExp: null },
  });
  return NextResponse.json({ ok: true });
}
