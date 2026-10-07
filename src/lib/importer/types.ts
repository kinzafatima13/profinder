export type VerificationStatus = "VERIFIED" | "NEEDS_VERIFICATION" | "POTENTIALLY_OUTDATED";

export function normalizeVerificationStatus(status?: string | null): string {
  if (!status) return "NEEDS_VERIFICATION";
  const s = status.toUpperCase();
  if (s.includes("VERIF") && !s.includes("UN") && !s.includes("NEED")) return "VERIFIED";
  if (s.includes("OUTDATE")) return "POTENTIALLY_OUTDATED";
  if (s.includes("NEED") || s.includes("REVIEW") || s.includes("UNVERIF")) return "NEEDS_VERIFICATION";
  return "NEEDS_VERIFICATION";
}

export type ProgramInput = {
  degree: string;
  major: string;
  officialName?: string | null;
  academicField?: string | null;
  discipline?: string | null;
  studyMode?: string | null;
  sourceUrl?: string | null;
  teachingLang?: string | null;
  requirements?: string | null;
  programUrl?: string | null;
  deadline?: string | null;
  openingDate?: string | null;
  scholarshipDeadline?: string | null;
  tuition?: string | null;
  applicationFee?: string | null;
  duration?: string | null;
  englishReq?: string | null;
  ielts?: string | null;
  toefl?: string | null;
  gpaRequirement?: string | null;
  cscType?: string | null;
  supervisorRequired?: string | null;
  applicationUrl?: string | null;
};

export type ScholarshipInput = {
  name: string;
  type?: string | null;
  requirements?: string | null;
  deadline?: string | null;
  officialUrl?: string | null;
  advantages?: string | null;
  coverage?: string | null;
  dataStatus?: string | null;
};

export type ProfessorInput = {
  name: string;
  nameZh?: string | null;
  position?: string | null;
  school?: string | null;
  department?: string | null;
  country?: string | null;
  email?: string | null;
  profileUrl?: string | null;
  personalWebsite?: string | null;
  researchInterests?: string | null;
  researchKeywords?: string | null;
  lab?: string | null;
  publications?: string | null;
  orcid?: string | null;
  openAlexId?: string | null;
  semanticScholarId?: string | null;
  profileIsPersonal?: boolean;
  dataStatus?: string | null;
  dataSource?: string | null;
  sourceUrl?: string | null;
  verifiedAt?: Date | null;
};

export type UniversityInput = {
  name: string;
  nameZh?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  officialUrl?: string | null;
  sourceUrl?: string | null;
  description?: string | null;
  agencyNumber?: string | null;
  openAlexId?: string | null;
  logoUrl?: string | null;
  dataStatus?: string | null;
  dataSource?: string | null;
  applicationUrl?: string | null;
  applicationFee?: string | null;
  applicationDeadline?: string | null;
  scholarshipUrl?: string | null;
  scholarshipDeadline?: string | null;
  verifiedAt?: Date | null;
  programs?: ProgramInput[];
  scholarships?: ScholarshipInput[];
  professors?: ProfessorInput[];
};

export type ImportMetrics = {
  startTime: number;
  endTime?: number;
  universitiesDiscovered: number;
  universitiesCreated: number;
  universitiesUpdated: number;
  universitiesFailed: number;
  professorsDiscovered: number;
  professorsCreated: number;
  professorsUpdated: number;
  professorsEnriched: number;
  professorsFailed: number;
  publicationsImported: number;
  duplicatesSkipped: number;
  recordsNeedingVerification: number;
  recordsVerified: number;
  failedUrls: { url: string; reason: string }[];
  apiErrors: { endpoint: string; error: string }[];
};
