import { conceptsFor, sharedConcepts } from "./concepts";
import type { ExtractedProfile } from "./extract";
import type { Weights } from "./weights";

export type ScorePart = { key: string; label: string; score: number | null; weight: number; note: string };

export type EngineCandidate = {
  professorId: string;
  professorName: string;
  position: string | null;
  department: string | null;
  email: string | null;
  profileUrl: string | null;
  researchInterests: string | null;
  researchKeywords: string | null;
  publications: string | null;
  publicationTitles: { title: string; year: number | null; sourceUrl: string | null }[];
  areas: string[];
  topics: string[];
  verificationStatus: string;
  dataStatus: string;
  sourceUrl: string | null;
  university: { id: string; name: string; country: string; city: string | null; officialUrl: string | null; verificationStatus: string };
  program: null | {
    id: string;
    degree: string;
    major: string;
    teachingLang: string | null;
    sourceUrl: string | null;
    verificationStatus: string;
    researchAreas: string[];
    gpaRequirement: string | null;
  };
  fundingOnFile: boolean;
  fundingNames: string[];
};

export type RankedMatch = {
  university: EngineCandidate["university"];
  program: EngineCandidate["program"];
  professor: {
    id: string;
    name: string;
    position: string | null;
    department: string | null;
    email: string | null;
    profileUrl: string | null;
    researchInterests: string | null;
    areas: string[];
  };
  score: number;
  label: string;
  scoreBreakdown: ScorePart[];
  reasons: string[];
  sourceLinks: { label: string; url: string }[];
  verificationStatus: string;
  matchedPublicationTitles: string[];
};

const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "your", "using", "based", "research"]);

function tokens(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9+\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word))
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const token of a) if (b.has(token)) hit++;
  return hit / Math.min(a.size, b.size);
}

function recordText(candidate: EngineCandidate) {
  return [
    candidate.researchInterests,
    candidate.researchKeywords,
    candidate.department,
    candidate.areas.join(" "),
    candidate.topics.join(" "),
    candidate.publications,
    candidate.publicationTitles.map((item) => item.title).join(" "),
    candidate.program?.major,
    candidate.program?.researchAreas.join(" "),
  ].filter(Boolean).join(" ");
}

export function rankCandidate(profile: ExtractedProfile, candidate: EngineCandidate, weights: Weights): RankedMatch | null {
  if (profile.countries.length) {
    const country = candidate.university.country.toLowerCase();
    if (!profile.countries.some((item) => country.includes(item.toLowerCase()))) return null;
  }
  if (profile.targetDegree && candidate.program) {
    const degree = candidate.program.degree.toLowerCase();
    const wantsPhd = profile.targetDegree === "PhD";
    const isPhd = /phd|doctor/.test(degree);
    const isMaster = /master|msc|m\.s/.test(degree);
    if (wantsPhd && isMaster && !isPhd) return null;
    if (!wantsPhd && isPhd && !isMaster) return null;
  }
  if (profile.universities.length) {
    const name = candidate.university.name.toLowerCase();
    if (!profile.universities.some((item) => name.includes(item.toLowerCase()))) return null;
  }

  const student = tokens([profile.researchInterests, profile.field, profile.backgroundField, profile.keywords.join(" ")].filter(Boolean).join(" "));
  const stored = recordText(candidate);
  const storedTokens = tokens(stored);
  const lexical = overlap(student, storedTokens);
  const concepts = sharedConcepts(profile.researchInterests, stored);
  const conceptScore = concepts.length ? Math.min(1, 0.45 + concepts.length * 0.2) : 0;
  const research = Math.round(Math.min(100, (lexical * 0.62 + conceptScore * 0.38) * 100));

  const profText = tokens([candidate.researchInterests, candidate.areas.join(" "), candidate.topics.join(" ")].filter(Boolean).join(" "));
  const professor = Math.round(overlap(student, profText) * 100);

  const programText = candidate.program
    ? tokens([candidate.program.major, candidate.program.degree, candidate.program.researchAreas.join(" ")].join(" "))
    : new Set<string>();
  const program = candidate.program ? Math.round(Math.max(overlap(student, programText), profile.field && candidate.program.major.toLowerCase().includes(profile.field.toLowerCase()) ? 0.7 : 0) * 100) : null;

  const eligibility = candidate.program?.gpaRequirement ? 60 : null;
  const funding = profile.fundingRequired == null ? null : candidate.fundingOnFile ? 100 : null;
  const location = profile.countries.length ? 100 : null;

  const parts: ScorePart[] = [
    { key: "research", label: "Research similarity", score: research, weight: weights.research, note: concepts.length ? `Concept overlap: ${concepts.map((item) => item.label).join(", ")}` : "Token overlap with stored research text" },
    { key: "professor", label: "Professor match", score: professor, weight: weights.professor, note: "Compared with stored interests, areas, and topics" },
    { key: "program", label: "Program match", score: program, weight: weights.program, note: candidate.program ? "Compared with the linked program major" : "Information not available" },
    { key: "eligibility", label: "Eligibility", score: eligibility, weight: weights.eligibility, note: candidate.program?.gpaRequirement ? "A GPA note is on file; this is not an admission decision" : "Information not available" },
    { key: "funding", label: "Funding", score: funding, weight: weights.funding, note: candidate.fundingOnFile ? "A funding record is linked to this university" : "Information not available" },
    { key: "location", label: "Location", score: location, weight: weights.location, note: profile.countries.length ? "Country matches the stated preference" : "No country constraint" },
  ];

  const active = parts.filter((part) => part.score != null && part.weight > 0);
  const weightTotal = active.reduce((sum, part) => sum + part.weight, 0);
  if (!weightTotal || research < 12) return null;
  const score = Math.round(active.reduce((sum, part) => sum + (part.score || 0) * part.weight, 0) / weightTotal);
  if (score < 20) return null;

  const relatedPapers = candidate.publicationTitles.filter((item) => {
    const paperTokens = tokens(item.title);
    return overlap(student, paperTokens) > 0 || sharedConcepts(profile.researchInterests, item.title).length > 0;
  });

  const reasons: string[] = [];
  if (concepts.length) reasons.push(`Your interest overlaps a stored concept on this profile: ${concepts.map((item) => item.label).join(", ")}.`);
  else if (research >= 40) reasons.push("Stored research interests or topics share terms with your description.");
  if (relatedPapers.length) reasons.push(`${relatedPapers.length} stored publication title${relatedPapers.length === 1 ? "" : "s"} relate to your stated interests.`);
  else if (!candidate.publicationTitles.length && !candidate.publications) reasons.push("No publications are stored for this professor.");
  if (candidate.program) reasons.push(`Linked program on file: ${candidate.program.degree} in ${candidate.program.major}.`);
  else reasons.push("No linked program is stored for this professor.");
  if (profile.fundingRequired) reasons.push(candidate.fundingOnFile ? `Funding record on file: ${candidate.fundingNames.slice(0, 2).join(", ") || "scholarship"}.` : "Funding information is not available for this university.");
  reasons.push(verificationLabel(candidate));

  return {
    university: candidate.university,
    program: candidate.program,
    professor: {
      id: candidate.professorId,
      name: candidate.professorName,
      position: candidate.position,
      department: candidate.department,
      email: candidate.email,
      profileUrl: candidate.profileUrl,
      researchInterests: candidate.researchInterests,
      areas: candidate.areas,
    },
    score,
    label: score >= 75 ? "Strong match" : score >= 55 ? "Good match" : "Partial match",
    scoreBreakdown: parts,
    reasons,
    sourceLinks: [
      candidate.profileUrl ? { label: "Professor profile", url: candidate.profileUrl } : null,
      candidate.program?.sourceUrl ? { label: "Program source", url: candidate.program.sourceUrl } : null,
      candidate.university.officialUrl ? { label: "University site", url: candidate.university.officialUrl } : null,
    ].filter((item): item is { label: string; url: string } => Boolean(item)),
    verificationStatus: verificationLabel(candidate),
    matchedPublicationTitles: relatedPapers.slice(0, 3).map((item) => item.title),
  };
}

function verificationLabel(candidate: EngineCandidate) {
  const status = (candidate.verificationStatus || candidate.dataStatus || "UNVERIFIED").toUpperCase();
  if (status === "VERIFIED" || candidate.dataStatus === "verified") return "Verified official source on file.";
  if (candidate.profileUrl || candidate.sourceUrl) return "University-associated source on file. Not marked verified.";
  return "Unverified record. Do not treat as authoritative.";
}

export function profileSummary(profile: ExtractedProfile) {
  return {
    targetDegree: profile.targetDegree,
    countries: profile.countries,
    field: profile.field,
    fundingRequired: profile.fundingRequired,
    concepts: conceptsFor(profile.researchInterests).map((item) => item.label),
  };
}
