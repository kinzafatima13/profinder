export type TargetLevel = "High" | "Medium" | "Low";

export function newestStoredYear(text: string | null | undefined, years: Array<number | null | undefined> = []) {
  const found = years.filter((year): year is number => typeof year === "number" && year >= 1950 && year <= 2030);
  for (const match of text?.matchAll(/\b(19|20)\d{2}\b/g) ?? []) {
    const year = Number(match[0]);
    if (year >= 1950 && year <= 2030) found.push(year);
  }
  if (!found.length) return null;
  return Math.max(...found);
}

export function assessTarget(input: {
  matchScore: number | null;
  verified: boolean;
  hasEmail: boolean;
  newestYear: number | null;
}) {
  const reasons: string[] = [];
  let points = 0;

  if (input.matchScore == null) {
    reasons.push("Research fit is not included until you sign in and save research interests.");
  } else if (input.matchScore >= 50) {
    points += 2;
    reasons.push(`Research fit is ${input.matchScore}%.`);
  } else if (input.matchScore >= 25) {
    points += 1;
    reasons.push(`Research fit is ${input.matchScore}%, which is only partial.`);
  } else {
    reasons.push(`Research fit is ${input.matchScore}%, which is low.`);
  }

  if (input.verified) {
    points += 2;
    reasons.push("Affiliation is verified from an official university page.");
  } else {
    reasons.push("Affiliation is not verified.");
  }

  if (input.hasEmail) {
    points += 2;
    reasons.push("An email is stored.");
  } else {
    reasons.push("No email is stored.");
  }

  if (input.newestYear != null && input.newestYear >= 2024) {
    points += 2;
    reasons.push(`A stored publication year is ${input.newestYear}.`);
  } else if (input.newestYear != null) {
    points += 1;
    reasons.push(`The newest stored publication year is ${input.newestYear}.`);
  } else {
    reasons.push("No publication year is stored, so recent activity is unknown.");
  }

  reasons.push("Funding evidence is unknown, so it does not raise the priority.");

  let level: TargetLevel = points >= 6 ? "High" : points >= 3 ? "Medium" : "Low";
  if (!input.verified && level === "High") level = "Medium";
  return { level, reasons };
}

export function fundingStatement() {
  return {
    status: "Unknown" as const,
    text: "No grant, active project, or funded-student record is stored. Funding is not inferred from a job title or a paper.",
  };
}

export function timelineGroups(items: { title: string; year: number | null }[]) {
  const seen = new Set<string>();
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const key = item.title.trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    const bucket = item.year == null ? "Year not stored" : String(item.year);
    groups.set(bucket, [...(groups.get(bucket) ?? []), key]);
  }
  const years = [...groups.keys()].filter((key) => key !== "Year not stored").sort((a, b) => Number(b) - Number(a));
  if (groups.has("Year not stored")) years.push("Year not stored");
  return years.map((year) => ({ year, titles: groups.get(year) ?? [] }));
}
