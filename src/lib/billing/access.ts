export type SubscriptionSnapshot = {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
} | null;

const OPEN = new Set(["ACTIVE", "TRIALING", "PAST_DUE"]);

export function hasProAccess(plan: string | null | undefined, subscription: SubscriptionSnapshot) {
  if (subscription) {
    if (OPEN.has(subscription.status)) return true;
    if (
      subscription.cancelAtPeriodEnd &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd.getTime() > Date.now()
    ) {
      return true;
    }
    return false;
  }
  return plan === "pro";
}

export function mapStripeStatus(status: string) {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "canceled") return "CANCELED";
  if (status === "incomplete") return "INCOMPLETE";
  if (status === "incomplete_expired") return "EXPIRED";
  return "INCOMPLETE";
}
