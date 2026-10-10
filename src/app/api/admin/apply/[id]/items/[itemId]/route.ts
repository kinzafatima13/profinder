import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isItemStatus, logApplyActivity, requireFounder } from "@/lib/apply-admin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const founder = await requireFounder();
  if (!founder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const item = await prisma.applyRequestItem.findFirst({ where: { id: params.itemId, requestId: params.id } });
  if (!item) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (!isItemStatus(String(body.status || ""))) return NextResponse.json({ error: "Unknown application status." }, { status: 400 });
  const note = typeof body.preparationNote === "string" ? body.preparationNote.slice(0, 2000) : undefined;
  const updated = await prisma.applyRequestItem.update({
    where: { id: item.id },
    data: { status: String(body.status), ...(note !== undefined ? { preparationNote: note } : {}) },
    select: { id: true, status: true, preparationNote: true },
  });
  await logApplyActivity(params.id, "application_status_changed", founder.id, { itemId: item.id, to: updated.status });
  return NextResponse.json({ item: updated });
}
