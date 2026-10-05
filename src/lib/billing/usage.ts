import { prisma } from "@/lib/prisma";
import { hasProAccess } from "@/lib/billing/access";
import { limitFor, type Feature } from "@/lib/billing/plans";

function periodKey() {
  return new Date().toISOString().slice(0, 7);
}

export async function subscriptionFor(studentId: string) {
  return prisma.subscription.findUnique({ where: { studentId } });
}

export async function isPro(student: { id: string; plan: string }) {
  const subscription = await subscriptionFor(student.id);
  return hasProAccess(student.plan, subscription);
}

export async function consumeUsage(studentId: string, feature: Feature, pro: boolean) {
  const limit = limitFor(feature, pro);
  if (limit == null) return { ok: true, used: 0, limit: null as number | null };
  const period = periodKey();
  const row = await prisma.usageCounter.upsert({
    where: { studentId_feature_period: { studentId, feature, period } },
    create: { studentId, feature, period, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (row.count > limit) {
    await prisma.usageCounter.update({ where: { id: row.id }, data: { count: { decrement: 1 } } });
    return { ok: false, used: limit, limit };
  }
  return { ok: true, used: row.count, limit };
}

export function limitMessage(feature: Feature, used: number, limit: number) {
  if (feature === "AI_PROFESSOR_MATCH") {
    return `You've used ${used}/${limit} professor match searches this month. Upgrade to Pro for unlimited matching.`;
  }
  if (feature === "AI_OUTREACH") {
    return `You've used ${used}/${limit} outreach drafts this month. Upgrade to Pro for unlimited drafts.`;
  }
  if (feature === "COMPARISONS") {
    return `You've used ${used}/${limit} comparisons this month. Upgrade to Pro for unlimited comparison.`;
  }
  if (feature === "ACTIVE_APPLICATIONS") {
    return `Free includes ${limit} active applications. Upgrade to Pro for unlimited tracking.`;
  }
  return `You've reached the Free limit for this feature (${used}/${limit}). Upgrade to Pro.`;
}
