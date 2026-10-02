export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export function splitName(displayName: string): { firstName?: string; lastName?: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return { firstName: displayName };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function openAlexShortId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.match(/(I\d+|A\d+|W\d+|T\d+)/);
  return match ? match[1] : urlOrId;
}

export function cleanOrcid(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/i);
  return match ? match[0].toUpperCase() : null;
}
