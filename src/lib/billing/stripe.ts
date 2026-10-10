import { prisma } from "@/lib/prisma";
import { hasProAccess, mapStripeStatus } from "@/lib/billing/access";

type StripeClient = {
  checkout: { sessions: { create: (input: Record<string, unknown>) => Promise<{ url: string | null }> } };
  billingPortal: { sessions: { create: (input: Record<string, unknown>) => Promise<{ url: string | null }> } };
  webhooks: { constructEvent: (payload: string, signature: string, secret: string) => StripeEvent };
  subscriptions: { retrieve: (id: string) => Promise<StripeSubscription> };
};

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

type StripeSubscription = {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number;
  current_period_end: number;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string } }> };
};

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_MONTHLY_PRICE_ID && process.env.STRIPE_PRO_ANNUAL_PRICE_ID);
}

export function priceIdFor(plan: "PRO_MONTHLY" | "PRO_ANNUAL") {
  return plan === "PRO_ANNUAL" ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
}

export function planForPrice(priceId: string | undefined) {
  if (priceId && priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) return "PRO_ANNUAL";
  if (priceId && priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) return "PRO_MONTHLY";
  return "PRO_MONTHLY";
}

export async function stripeClient(): Promise<StripeClient> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  const stripe = await import("stripe");
  return new stripe.default(key) as unknown as StripeClient;
}

function unixDate(value: number | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

export async function syncSubscription(input: {
  studentId: string;
  customerId: string | null;
  subscription: StripeSubscription;
}) {
  const priceId = input.subscription.items?.data?.[0]?.price?.id;
  const plan = (input.subscription.metadata?.plan as string) || planForPrice(priceId);
  const status = mapStripeStatus(input.subscription.status);
  const currentPeriodEnd = unixDate(input.subscription.current_period_end);
  const saved = await prisma.subscription.upsert({
    where: { studentId: input.studentId },
    create: {
      studentId: input.studentId,
      plan,
      status,
      provider: "stripe",
      providerCustomerId: input.customerId,
      providerSubscriptionId: input.subscription.id,
      priceId: priceId || null,
      currentPeriodStart: unixDate(input.subscription.current_period_start),
      currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(input.subscription.cancel_at_period_end),
    },
    update: {
      plan,
      status,
      providerCustomerId: input.customerId,
      providerSubscriptionId: input.subscription.id,
      priceId: priceId || null,
      currentPeriodStart: unixDate(input.subscription.current_period_start),
      currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(input.subscription.cancel_at_period_end),
    },
  });
  const pro = hasProAccess(saved);
  await prisma.student.update({ where: { id: input.studentId }, data: { plan: pro ? "pro" : "free" } });
  return saved;
}

export async function applyStripeEvent(event: StripeEvent, client: StripeClient) {
  const seen = await prisma.billingEvent.findUnique({ where: { id: event.id } });
  if (seen) return { duplicate: true };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const meta = (session.metadata || {}) as { studentId?: string; applyRequestId?: string; service?: string };
    const studentId = String(meta.studentId || session.client_reference_id || "");
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
    const customerId = typeof session.customer === "string" ? session.customer : null;
    const paymentStatus = String(session.payment_status || "");

    // One-time Apply for Me package payment (not a subscription).
    if (meta.service === "apply_for_me" && meta.applyRequestId && paymentStatus === "paid") {
      const request = await prisma.applyRequest.findUnique({ where: { id: meta.applyRequestId } });
      if (request && request.studentId === (meta.studentId || request.studentId)) {
        const amountTotal = typeof session.amount_total === "number" ? session.amount_total : null;
        const amountOk = amountTotal === null || amountTotal === request.feeCents;
        if (amountOk && request.paymentStatus !== "paid") {
          await prisma.applyRequest.update({
            where: { id: request.id },
            data: {
              paymentStatus: "paid",
              paymentRef: String(session.id || ""),
              paymentAt: new Date(),
              status: request.status === "needs_action" ? "needs_action" : "preparing",
            },
          });
          await prisma.applyRequestItem.updateMany({
            where: { requestId: request.id, status: "selected" },
            data: { status: "preparing" },
          });
          await prisma.applyActivity.create({
            data: {
              requestId: request.id,
              actorId: request.studentId,
              action: "payment_received",
              meta: JSON.stringify({ via: "webhook", sessionId: String(session.id || "") }).slice(0, 1000),
            },
          });
        } else if (request.paymentStatus === "paid" && !request.paymentRef && session.id) {
          await prisma.applyRequest.update({
            where: { id: request.id },
            data: { paymentRef: String(session.id) },
          });
        }
      }
    }

    if (studentId && subscriptionId) {
      const subscription = await client.subscriptions.retrieve(subscriptionId);
      await syncSubscription({ studentId, customerId, subscription });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as unknown as StripeSubscription;
    const studentId = subscription.metadata?.studentId || "";
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || null;
    const owner = studentId
      ? studentId
      : (await prisma.subscription.findUnique({ where: { providerSubscriptionId: subscription.id } }))?.studentId;
    if (owner) await syncSubscription({ studentId: owner, customerId, subscription });
  }

  if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : "";
    if (subscriptionId) {
      const subscription = await client.subscriptions.retrieve(subscriptionId);
      const owner = subscription.metadata?.studentId
        || (await prisma.subscription.findUnique({ where: { providerSubscriptionId: subscription.id } }))?.studentId;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      if (owner) await syncSubscription({ studentId: owner, customerId, subscription });
    }
  }

  await prisma.billingEvent.create({ data: { id: event.id, type: event.type } });
  return { duplicate: false };
}
