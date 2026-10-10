import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logApplyActivity } from "@/lib/apply-admin";
import { deleteApplyFile, storeApplyFile } from "@/lib/apply-storage";

const KINDS = new Set(["passport", "transcript", "cv", "statement", "other"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function studentOwnsRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return null;
  const request = await prisma.applyRequest.findFirst({ where: { id: requestId, studentId: student.id } });
  if (!request) return null;
  return { student, request };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await studentOwnsRequest(params.id);
  if (!owned) return NextResponse.json({ error: "Sign in first or request not found." }, { status: 401 });
  const { student, request } = owned;
  if (request.paymentStatus === "paid" && request.status !== "needs_action") {
    return NextResponse.json({ error: "Documents are locked after payment unless more are requested." }, { status: 409 });
  }

  const form = await req.formData();
  const kind = String(form.get("kind") || "other");
  const file = form.get("file");
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Each file must be 8 MB or smaller." }, { status: 400 });

  let stored;
  try {
    stored = await storeApplyFile(request.id, file.name, Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNSUPPORTED_FILE") {
      return NextResponse.json({ error: "Upload a PDF, image, or Word file. HTML and SVG are not accepted." }, { status: 400 });
    }
    if (code === "PRIVATE_STORAGE_UNCONFIGURED") {
      return NextResponse.json({ error: "Private document storage is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const document = await prisma.applyDocument.create({
    data: {
      requestId: request.id,
      kind,
      name: file.name.slice(0, 180),
      storedName: stored.storedName,
      storageProvider: stored.storageProvider,
      objectKey: stored.objectKey,
      size: file.size,
    },
  });
  if (request.status === "draft") {
    await prisma.applyRequest.update({ where: { id: request.id }, data: { status: "awaiting_payment" } });
  }
  await logApplyActivity(request.id, "document_uploaded", student.id, { kind, name: stored.storedName });
  return NextResponse.json({ document: { id: document.id, kind: document.kind, name: document.name, size: document.size } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await studentOwnsRequest(params.id);
  if (!owned) return NextResponse.json({ error: "Sign in first or request not found." }, { status: 401 });
  const { student, request } = owned;
  if (request.paymentStatus === "paid" && request.status !== "needs_action") {
    return NextResponse.json({ error: "Documents are locked after payment unless more are requested." }, { status: 409 });
  }

  const documentId = req.nextUrl.searchParams.get("documentId") || "";
  if (!documentId) return NextResponse.json({ error: "documentId is required." }, { status: 400 });

  const document = await prisma.applyDocument.findFirst({
    where: { id: documentId, requestId: request.id },
  });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  await deleteApplyFile(document.storageProvider, document.objectKey, document.storedName);
  await prisma.applyDocument.delete({ where: { id: document.id } });
  await logApplyActivity(request.id, "document_removed", student.id, { documentId: document.id, kind: document.kind });
  return NextResponse.json({ ok: true, documentId: document.id });
}
