import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const name = body.name ? String(body.name).trim() : null;
    const degree = body.degree ? String(body.degree) : null;
    const major = body.major ? String(body.major) : null;
    const researchInterests = body.researchInterests
      ? String(body.researchInterests)
      : null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const existing = await prisma.student.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const student = await prisma.student.create({
      data: {
        email,
        passwordHash,
        name,
        degree,
        major,
        researchInterests,
        plan: "free",
      },
    });

    return NextResponse.json({
      id: student.id,
      email: student.email,
      name: student.name,
      plan: student.plan,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Failed to create account." },
      { status: 500 }
    );
  }
}
