import type { Metadata } from "next";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "ProFinder Pro | Pricing" },
  description: "Free discovery stays open. Pro is $9.99 a month or $89.99 a year, and it starts only after Stripe confirms payment.",
  alternates: { canonical: `${SITE}/pricing` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
