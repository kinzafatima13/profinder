import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FIELDS = [
  "name",
  "degree",
  "major",
  "academicBackground",
  "researchInterests",
  "skills",
  "projects",
  "cvText",
  "preferredCountries",
  "preferredUniversities",
] as const;

async function currentStudent() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.student.findUnique({ where: { email: session.user.email } });
}

export async function GET() {
  const student = await currentStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { passwordHash: _pw, ...safe } = student;
  return NextResponse.json({ profile: safe });
}

export async function PATCH(req: NextRequest) {
  const student = await currentStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  for (const key of FIELDS) {
    if (key in body) {
      const value = body[key];
      if (value != null && typeof value !== "string") {
        return NextResponse.json({ error: `${key} must be text` }, { status: 400 });
      }
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (trimmed.length > 4000) {
        return NextResponse.json({ error: `${key} is too long` }, { status: 400 });
      }
      data[key] = trimmed || null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data,
  });
  const { passwordHash: _pw, ...safe } = updated;
  return NextResponse.json({ profile: safe });
}
