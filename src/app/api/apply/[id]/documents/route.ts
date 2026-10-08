import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const KINDS = new Set(["passport", "transcript", "cv", "statement", "other"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const request = await prisma.applyRequest.findFirst({ where: { id: params.id, studentId: student.id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.paymentStatus === "paid" && request.status !== "needs_action") {
    return NextResponse.json({ error: "Documents are locked after payment unless more are requested." }, { status: 409 });
  }

  const form = await req.formData();
  const kind = String(form.get("kind") || "other");
  const file = form.get("file");
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Each file must be 8 MB or smaller." }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "document";
  const storedName = `${request.id}-${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "data", "apply-uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), Buffer.from(await file.arrayBuffer()));

  const document = await prisma.applyDocument.create({
    data: { requestId: request.id, kind, name: file.name.slice(0, 180), storedName, size: file.size },
  });
  if (request.status === "draft") {
    await prisma.applyRequest.update({ where: { id: request.id }, data: { status: "awaiting_payment" } });
  }
  return NextResponse.json({ document: { id: document.id, kind: document.kind, name: document.name, size: document.size } });
}
