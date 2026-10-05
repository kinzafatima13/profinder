export function deadlineStatus(text: string | null | undefined, verified: boolean) {
  const detail = text?.trim() || "No date stored";
  if (!verified) {
    return {
      source: "Unverified",
      countdown: "No countdown",
      detail,
    };
  }
  const iso = detail.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (!iso) {
    return {
      source: "Verified record, but the date is not a calendar day",
      countdown: "No countdown",
      detail,
    };
  }
  const target = Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const days = Math.ceil((target - Date.now()) / 86_400_000);
  return {
    source: "Verified official date",
    countdown: days < 0 ? "Closed" : `${days} days`,
    detail: iso[0],
  };
}
