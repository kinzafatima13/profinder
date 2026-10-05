export const FEATURES = {
  AI_PROFESSOR_MATCH: "AI_PROFESSOR_MATCH",
  AI_OUTREACH: "AI_OUTREACH",
  COMPARISONS: "COMPARISONS",
  ACTIVE_APPLICATIONS: "ACTIVE_APPLICATIONS",
  SAVED_PROFESSORS: "SAVED_PROFESSORS",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

/** Monthly or standing caps for Free. Null means unlimited. */
export const FREE_LIMITS: Record<Feature, number | null> = {
  AI_PROFESSOR_MATCH: 10,
  AI_OUTREACH: 3,
  COMPARISONS: 3,
  ACTIVE_APPLICATIONS: 2,
  SAVED_PROFESSORS: 5,
};

export const PRO_PRICE = {
  monthly: { amount: "$9.99", interval: "month" },
  annual: { amount: "$89.99", interval: "year", note: "Save about 25%" },
};

export function limitFor(feature: Feature, pro: boolean) {
  if (pro) return null;
  return FREE_LIMITS[feature];
}
