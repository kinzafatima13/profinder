export type WeightKey = "research" | "professor" | "program" | "eligibility" | "funding" | "location";

export type Weights = Record<WeightKey, number>;

export const DEFAULT_WEIGHTS: Weights = {
  research: 35,
  professor: 20,
  program: 20,
  eligibility: 10,
  funding: 10,
  location: 5,
};

export const WEIGHT_PRESETS: Record<string, Weights> = {
  balanced: DEFAULT_WEIGHTS,
  research: { research: 50, professor: 25, program: 15, eligibility: 10, funding: 0, location: 0 },
  funding: { research: 30, professor: 0, program: 15, eligibility: 20, funding: 30, location: 5 },
  university: { research: 20, professor: 10, program: 25, eligibility: 10, funding: 10, location: 25 },
  professor: { research: 30, professor: 40, program: 15, eligibility: 10, funding: 5, location: 0 },
  eligibility: { research: 20, professor: 10, program: 20, eligibility: 40, funding: 5, location: 5 },
  location: { research: 25, professor: 10, program: 20, eligibility: 10, funding: 5, location: 30 },
  program: { research: 20, professor: 10, program: 45, eligibility: 15, funding: 5, location: 5 },
};

export function resolveWeights(priority?: string | null, override?: Partial<Weights> | null): Weights {
  const base = (priority && WEIGHT_PRESETS[priority]) || DEFAULT_WEIGHTS;
  const merged = { ...base, ...(override || {}) };
  const total = Object.values(merged).reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return DEFAULT_WEIGHTS;
  return {
    research: Math.round((Math.max(0, merged.research) / total) * 100),
    professor: Math.round((Math.max(0, merged.professor) / total) * 100),
    program: Math.round((Math.max(0, merged.program) / total) * 100),
    eligibility: Math.round((Math.max(0, merged.eligibility) / total) * 100),
    funding: Math.round((Math.max(0, merged.funding) / total) * 100),
    location: Math.round((Math.max(0, merged.location) / total) * 100),
  };
}
