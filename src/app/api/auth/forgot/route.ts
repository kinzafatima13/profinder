import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) return NextResponse.json({ ok: true, message: "If that account exists, a code was sent." });

  const code = String(crypto.randomInt(100000, 999999));
  const tokenData = {
    resetToken: crypto.createHash("sha256").update(code).digest("hex"),
    resetTokenExp: new Date(Date.now() + 1000 * 60 * 15),
  };
  try {
    await prisma.student.update({ where: { id: student.id }, data: tokenData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("resetToken")) throw error;
    await prisma.$executeRawUnsafe("ALTER TABLE Student ADD COLUMN resetToken TEXT");
    await prisma.$executeRawUnsafe("ALTER TABLE Student ADD COLUMN resetTokenExp DATETIME");
    await prisma.student.update({ where: { id: student.id }, data: tokenData });
  }

  try {
    const sent = await sendCode(email, code);
    if (!sent) {
      const allowLocal = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_RESET === "true";
      if (allowLocal) {
        return NextResponse.json({
          ok: true,
          message: "No mailbox is configured, so the code is shown here. It expires in 15 minutes.",
          devCode: code,
        });
      }
      return NextResponse.json({
        error: "No sending mailbox is configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS.",
      }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "The mailbox rejected the message. Check the SMTP settings." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: "Verification code sent to that email." });
}
