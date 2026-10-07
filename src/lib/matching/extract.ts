export type ExtractedProfile = {
  raw: string;
  backgroundDegree: string | null;
  backgroundField: string | null;
  targetDegree: string | null;
  countries: string[];
  universities: string[];
  field: string | null;
  researchInterests: string;
  keywords: string[];
  skills: string[];
  fundingRequired: boolean | null;
  language: string | null;
};

const COUNTRIES = ["china", "pakistan", "germany", "usa", "united states", "uk", "united kingdom", "canada", "australia", "japan", "korea", "south korea", "malaysia", "singapore"];

export function extractProfile(raw: string, hints?: Partial<ExtractedProfile>): ExtractedProfile {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const targetDegree = hints?.targetDegree
    || (/\bph\.?d|doctoral|doctorate\b/.test(lower) ? "PhD" : /\bmaster|msc|m\.s\b/.test(lower) ? "Master" : null);
  const backgroundDegree = /\bbachelor|b\.?s\b|undergraduate|software engineering graduate\b/.test(lower) ? "Bachelor" : null;
  const countries = COUNTRIES.filter((country) => lower.includes(country)).map((country) => country === "usa" ? "United States" : country === "uk" ? "United Kingdom" : title(country));
  const fundingRequired = hints?.fundingRequired ?? (/\bfunded|scholarship|fully funded|csc\b/.test(lower) ? true : /\bself[- ]funded\b/.test(lower) ? false : null);
  const language = /\benglish[- ]taught|in english\b/.test(lower) ? "English" : /\bchinese[- ]taught\b/.test(lower) ? "Chinese" : null;
  const keywords = lower
    .replace(/[^a-z0-9+\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
  return {
    raw: text,
    backgroundDegree,
    backgroundField: hints?.backgroundField || fieldHint(lower),
    targetDegree,
    countries: hints?.countries?.length ? hints.countries : [...new Set(countries)],
    universities: hints?.universities || [],
    field: hints?.field || fieldHint(lower),
    researchInterests: hints?.researchInterests || text,
    keywords: [...new Set(keywords)].slice(0, 24),
    skills: hints?.skills || [],
    fundingRequired,
    language,
  };
}

function fieldHint(lower: string): string | null {
  const pairs: [RegExp, string][] = [
    [/agricultur|agronom|crop|plant patholog/, "Agriculture"],
    [/computer vision|machine learning|artificial intelligence|\bai\b|software/, "Computer Science"],
    [/medicin|health|clinical|biomed/, "Health"],
    [/financ|market|econom|business|management/, "Business"],
    [/chemistr/, "Chemistry"],
    [/biolog/, "Biology"],
    [/physic/, "Physics"],
    [/mechanical/, "Mechanical Engineering"],
    [/civil engineer/, "Civil Engineering"],
    [/electrical/, "Electrical Engineering"],
  ];
  return pairs.find(([pattern]) => pattern.test(lower))?.[1] || null;
}

function title(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "your", "have", "has", "want", "into", "about", "interested", "particularly", "focusing", "graduate"]);
