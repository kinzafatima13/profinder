import type { Metadata } from "next";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Scholarships in China | ProFinder" },
  description: "CSC, university, and presidential scholarships stored for Chinese universities. A deadline is shown only when a date is stored, and it stays unverified unless an official source is linked.",
  alternates: { canonical: `${SITE}/scholarship` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
