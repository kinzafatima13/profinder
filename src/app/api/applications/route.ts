import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUSES = [
  "Saved",
  "Researching",
  "Contacted",
  "Follow-up",
  "Replied",
  "Interested",
  "Application Started",
  "Application Submitted",
  "Accepted",
  "Rejected",
];

const FREE_LIMIT = 5;

async function currentStudent() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.student.findUnique({
    where: { email: session.user.email },
    select: { id: true, plan: true },
  });
}

function clean(value: unknown, max = 2000) {
  if (value == null) return undefined;
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max);
}

export async function GET() {
  const student = await currentStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { studentId: student.id },
    include: { professor: { include: { university: true } } },
    orderBy: [{ deadline: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ applications, plan: student.plan, statuses: STATUSES });
}

export async function POST(req: NextRequest) {
  const student = await currentStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const professorId = typeof body.professorId === "string" ? body.professorId : "";
  if (!professorId) return NextResponse.json({ error: "professorId required" }, { status: 400 });

  const professor = await prisma.professor.findUnique({ where: { id: professorId } });
  if (!professor) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

  const existing = await prisma.application.findFirst({
    where: { studentId: student.id, professorId },
    include: { professor: { include: { university: true } } },
  });
  if (existing) {
    return NextResponse.json({ application: existing, alreadyExists: true });
  }

  if (student.plan !== "pro") {
    const count = await prisma.application.count({ where: { studentId: student.id } });
    if (count >= FREE_LIMIT) {
      return NextResponse.json(
        {
          error: "Free plan allows up to 5 tracked applications. Upgrade to Pro for unlimited tracking.",
          code: "PLAN_LIMIT",
        },
        { status: 403 }
      );
    }
  }

  const status = STATUSES.includes(body.status) ? body.status : "Saved";
  const application = await prisma.application.create({
    data: {
      studentId: student.id,
      professorId,
      universityId: professor.universityId,
      status,
      notes: clean(body.notes) || undefined,
      degree: clean(body.degree, 80) || undefined,
      programName: clean(body.programName, 200) || undefined,
      scholarship: clean(body.scholarship, 200) || undefined,
      deadline: clean(body.deadline, 40) || undefined,
    },
    include: { professor: { include: { university: true } } },
  });

  return NextResponse.json({ application });
}

export async function PATCH(req: NextRequest) {
  const student = await currentStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const app = await prisma.application.findFirst({ where: { id, studentId: student.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.notes !== undefined ? { notes: clean(body.notes) } : {}),
      ...(body.deadline !== undefined ? { deadline: clean(body.deadline, 40) } : {}),
      ...(body.followUpDate !== undefined ? { followUpDate: clean(body.followUpDate, 40) } : {}),
      ...(body.scholarship !== undefined ? { scholarship: clean(body.scholarship, 200) } : {}),
      ...(body.contactStatus !== undefined ? { contactStatus: clean(body.contactStatus, 80) } : {}),
      ...(body.degree !== undefined ? { degree: clean(body.degree, 80) } : {}),
      ...(body.programName !== undefined ? { programName: clean(body.programName, 200) } : {}),
      ...(body.applicationUrl !== undefined ? { applicationUrl: clean(body.applicationUrl, 500) } : {}),
      ...(body.documentsJson !== undefined ? { documentsJson: clean(body.documentsJson, 4000) } : {}),
    },
    include: { professor: { include: { university: true } } },
  });

  return NextResponse.json({ application: updated });
}

export async function DELETE(req: NextRequest) {
  const student = await currentStudent();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const app = await prisma.application.findFirst({ where: { id, studentId: student.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
