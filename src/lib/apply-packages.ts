export const APPLY_PACKAGES = {
  intro: { id: "intro", label: "Three applications", applications: 3, feeCents: 3000, note: "One-time offer. $10 each." },
  set: { id: "set", label: "Five applications", applications: 5, feeCents: 6500, note: "One-time. $13 each." },
  custom: { id: "custom", label: "Custom", applications: null, feeCents: null, note: "6 to 12 applications, $12 each, one-time." },
} as const;

export function quoteApply(packageId: string, customCount: number) {
  if (packageId === "intro" || packageId === "pair") return { packageId: "intro", applications: 3, feeCents: 3000 };
  if (packageId === "set") return { packageId: "set", applications: 5, feeCents: 6500 };
  if (packageId === "custom") {
    const applications = Math.floor(customCount);
    if (applications < 6 || applications > 12) return null;
    return { packageId: "custom", applications, feeCents: applications * 1200 };
  }
  return null;
}
