import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const REQUEST_STATUSES = [
  "draft",
  "awaiting_payment",
  "documents_pending",
  "ready_for_review",
  "preparing",
  "submit_requested",
  "completed",
  "needs_action",
  "cancelled",
] as const;

export const ITEM_STATUSES = [
  "selected",
  "pending",
  "preparing",
  "ready_for_review",
  "approved",
  "submitted",
  "successful",
  "rejected",
  "needs_action",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  draft: "New",
  awaiting_payment: "Awaiting Payment",
  documents_pending: "Documents Pending",
  ready_for_review: "Ready to Apply",
  ready_to_apply: "Ready to Apply",
  preparing: "In Progress",
  submit_requested: "Submitted",
  submitted: "Submitted",
  completed: "Completed",
  needs_action: "Needs Action",
  cancelled: "Cancelled",
  selected: "Pending",
  pending: "Pending",
  approved: "Preparing",
  successful: "Successful",
  rejected: "Rejected",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] || status.replaceAll("_", " ");
}

export function isRequestStatus(value: string) {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isItemStatus(value: string) {
  return (ITEM_STATUSES as readonly string[]).includes(value);
}

export async function requireFounder() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;
  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) return null;
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (student.role !== "admin" && !allow.includes(student.email.toLowerCase())) return null;
  return student;
}

export async function logApplyActivity(requestId: string, action: string, actorId?: string | null, meta?: Record<string, string>) {
  await prisma.applyActivity.create({
    data: {
      requestId,
      actorId: actorId || null,
      action,
      meta: meta ? JSON.stringify(meta).slice(0, 1000) : null,
    },
  });
}

export function publicRequest<T extends { founderNote?: string | null }>(request: T) {
  const copy = { ...request };
  delete copy.founderNote;
  return copy;
}
