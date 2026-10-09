export type SavedSearch = {
  id: string;
  query: string;
  country?: string;
  degree?: string;
  funding?: string;
  priority?: string;
  label?: string;
  createdAt: string;
};

const KEY = "profinder_saved_searches";
const MAX = 20;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function listSavedSearches(): SavedSearch[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveSearch(input: Omit<SavedSearch, "id" | "createdAt"> & { id?: string }): SavedSearch[] {
  if (!canUseStorage()) return [];
  const next: SavedSearch = {
    id: input.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    query: input.query.trim(),
    country: input.country?.trim() || undefined,
    degree: input.degree?.trim() || undefined,
    funding: input.funding?.trim() || undefined,
    priority: input.priority?.trim() || undefined,
    label: input.label?.trim() || input.query.trim().slice(0, 60),
    createdAt: new Date().toISOString(),
  };
  if (!next.query) return listSavedSearches();
  const existing = listSavedSearches().filter(
    (row) =>
      !(row.query === next.query && row.country === next.country && row.degree === next.degree && row.funding === next.funding)
  );
  const list = [next, ...existing].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function removeSavedSearch(id: string): SavedSearch[] {
  if (!canUseStorage()) return [];
  const list = listSavedSearches().filter((row) => row.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function searchHref(row: Pick<SavedSearch, "query" | "country" | "degree" | "funding" | "priority">) {
  const params = new URLSearchParams();
  if (row.query) params.set("q", row.query);
  if (row.country) params.set("country", row.country);
  if (row.degree) params.set("degree", row.degree);
  if (row.funding) params.set("funding", row.funding);
  if (row.priority) params.set("priority", row.priority);
  const qs = params.toString();
  return qs ? `/find?${qs}` : "/find";
}
