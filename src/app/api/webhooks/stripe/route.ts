import { handleStripeWebhook } from "@/lib/billing/webhook";

export function POST(req: Request) {
  return handleStripeWebhook(req);
}

