import type { Metadata } from "next";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Apply for Me | ProFinder" },
  description: "Already know where you want to apply? Upload documents once, review each application, and approve before ProFinder submits.",
  alternates: { canonical: `${SITE}/apply` },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
