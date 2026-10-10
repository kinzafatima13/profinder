import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logApplyActivity, requireFounder } from "@/lib/apply-admin";
import { readApplyFile } from "@/lib/apply-storage";

export async function GET(req: NextRequest, { params }: { params: { documentId: string } }) {
  const founder = await requireFounder();
  if (!founder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const requestId = req.nextUrl.searchParams.get("requestId") || "";
  const document = await prisma.applyDocument.findFirst({ where: { id: params.documentId, requestId } });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const file = await readApplyFile(document.storageProvider, document.objectKey, document.storedName);
  if (!file) return NextResponse.json({ error: "Document is not available in private storage." }, { status: 404 });
  await logApplyActivity(document.requestId, "document_accessed", founder.id, { documentId: document.id, kind: document.kind });
  const filename = document.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "document";
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
