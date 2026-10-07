import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ensureSchema, prisma } from "@/lib/prisma";
import { rateLimit, requestKey } from "@/lib/rate-limit";

async function sendCode(to: string, code: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return false;
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject: "PROFINDER verification code",
    text: `Your PROFINDER password reset code is ${code}. It expires in 15 minutes.`,
  });
  return true;
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  const generic = { ok: true, message: "If that account exists, a code was sent." };
  if (!rateLimit(requestKey(req, "forgot"), 5, 60 * 60 * 1000).ok || !rateLimit(`forgot-email:${email}`, 3, 60 * 60 * 1000).ok) {
    return NextResponse.json(generic);
  }

  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) return NextResponse.json(generic);

  const code = String(crypto.randomInt(100000, 999999));
  const tokenData = {
    resetToken: crypto.createHash("sha256").update(code).digest("hex"),
    resetTokenExp: new Date(Date.now() + 1000 * 60 * 15),
  };
  await prisma.student.update({ where: { id: student.id }, data: tokenData });

  try {
    const sent = await sendCode(email, code);
    if (!sent) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ ...generic, devCode: code });
      }
      return NextResponse.json({ error: "Password reset email is not configured." }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "The mailbox rejected the message." }, { status: 502 });
  }
  return NextResponse.json(generic);
}
