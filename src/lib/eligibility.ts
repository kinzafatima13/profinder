import { tokenize } from "@/lib/matching";

export type FitReason = { tone: "ok" | "warn"; text: string };

export type FitProfile = {
  degree?: string | null;
  major?: string | null;
  interests?: string | null;
  gpa?: string | null;
  preferredUniversities?: string | null;
  preferredCountries?: string | null;
  nationality?: string | null;
  englishTest?: string | null;
};

function hits(left: string | null | undefined, right: string | null | undefined) {
  const a = tokenize(left);
  const b = tokenize(right);
  let n = 0;
  for (const token of a) if (b.has(token)) n += 1;
  return n;
}

function degreeFits(wanted: string | null | undefined, offered: string | null | undefined) {
  const want = (wanted ?? "").toLowerCase();
  const have = (offered ?? "").toLowerCase();
  if (!want || !have) return false;
  if (want.includes("phd") || want.includes("doctor")) return have.includes("phd") || have.includes("doctor");
  if (want.includes("master")) return have.includes("master");
  return have.includes(want);
}

export function scoreProgram(
  profile: FitProfile,
  program: { degree: string; major: string; universityName: string; deadline?: string | null; gpaRequirement?: string | null; englishReq?: string | null }
): { score: number; reasons: FitReason[] } {
  const reasons: FitReason[] = [];
  let score = 15;

  if (degreeFits(profile.degree, program.degree)) {
    score += 25;
    reasons.push({ tone: "ok", text: `Your degree matches this ${program.degree} program.` });
  } else if (profile.degree) {
    reasons.push({ tone: "warn", text: `Your degree is ${profile.degree}. This program is ${program.degree}.` });
  } else {
    reasons.push({ tone: "warn", text: "Add a degree on your profile before treating this as a match." });
  }

  const fieldHits = hits(profile.major, program.major) + hits(profile.interests, program.major);
  if (fieldHits > 0) {
    score += Math.min(35, fieldHits * 12);
    reasons.push({ tone: "ok", text: `Your field overlaps ${program.major}.` });
  } else {
    reasons.push({ tone: "warn", text: `No clear overlap between your major and ${program.major}.` });
  }

  const preferred = profile.preferredUniversities?.split(",")[0]?.trim().toLowerCase();
  if (preferred && program.universityName.toLowerCase().includes(preferred)) {
    score += 15;
    reasons.push({ tone: "ok", text: "This university is on your preferred list." });
  }

  if (profile.gpa?.trim()) {
    reasons.push({
      tone: "warn",
      text: program.gpaRequirement?.trim()
        ? `Your CGPA is on file. Stored requirement: ${program.gpaRequirement}. Confirm it on the official page.`
        : "Your CGPA is on file, but this program has no official minimum stored.",
    });
  } else {
    reasons.push({ tone: "warn", text: "CGPA is not on your profile, so eligibility cannot be checked." });
  }

  reasons.push({
    tone: "warn",
    text: program.englishReq?.trim()
      ? `Stored English note: ${program.englishReq}. This was not checked against a test score.`
      : "No official English requirement is stored.",
  });
  reasons.push({
    tone: "warn",
    text: `Deadline note: ${program.deadline?.trim() || "none stored"}. This is not an official date.`,
  });

  return { score: Math.max(0, Math.min(99, score)), reasons };
}

export function scoreScholarship(
  profile: FitProfile,
  scholarship: { name: string; type?: string | null; universityName?: string | null; deadline?: string | null }
): { score: number; reasons: FitReason[] } {
  const reasons: FitReason[] = [];
  let score = 20;
  const countries = (profile.preferredCountries ?? "").toLowerCase();
  if (!countries || countries.includes("china")) {
    score += 20;
    reasons.push({ tone: "ok", text: "Your preferred country includes China, and these records are for study in China." });
  } else {
    reasons.push({ tone: "warn", text: "Your preferred countries do not mention China." });
  }

  if (scholarship.type) {
    score += 15;
    reasons.push({ tone: "ok", text: `${scholarship.type} funding is the type stored for ${scholarship.name}.` });
  }

  const preferred = profile.preferredUniversities?.split(",")[0]?.trim().toLowerCase();
  if (preferred && scholarship.universityName?.toLowerCase().includes(preferred)) {
    score += 20;
    reasons.push({ tone: "ok", text: "The university is on your preferred list." });
  }

  reasons.push({ tone: "warn", text: "Full eligibility rules are not stored. This is not an admission or scholarship decision." });
  return { score: Math.max(0, Math.min(99, score)), reasons };
}

export function requirementChecklist(
  profile: FitProfile,
  record: { degree?: string | null; major?: string | null; gpaRequirement?: string | null; englishReq?: string | null }
) {
  const fieldHits = hits(profile.major, record.major) + hits(profile.interests, record.major);
  return [
    {
      item: "Nationality",
      text: profile.nationality?.trim()
        ? `Saved as ${profile.nationality.trim()}. No nationality rule is stored, so it was not checked.`
        : "Nationality is not on your profile. No nationality rule is stored.",
    },
    {
      item: "Degree",
      text: !profile.degree
        ? "Degree is not on your profile."
        : !record.degree
          ? `Your degree is ${profile.degree}. This record has no degree stored.`
          : degreeFits(profile.degree, record.degree)
            ? `Your degree matches ${record.degree}.`
            : `Your degree is ${profile.degree}. This record is ${record.degree}.`,
    },
    {
      item: "CGPA",
      text: !profile.gpa?.trim()
        ? "CGPA is not on your profile."
        : record.gpaRequirement?.trim()
          ? `Your CGPA is ${profile.gpa.trim()}. Stored note: ${record.gpaRequirement.trim()}. Confirm it on the official page.`
          : `Your CGPA is ${profile.gpa.trim()}. No official minimum is stored.`,
    },
    {
      item: "Age",
      text: "Age is not collected, and no age limit is stored.",
    },
    {
      item: "English",
      text: profile.englishTest?.trim()
        ? `Saved as ${profile.englishTest.trim()}. ${record.englishReq?.trim() ? `Stored note: ${record.englishReq.trim()}.` : "No official minimum is stored."} The score was not checked.`
        : "English proficiency is not on your profile. No official requirement is stored.",
    },
    {
      item: "Field",
      text: !record.major
        ? "No program field is stored on this record, so your major was not compared."
        : fieldHits > 0
          ? `Your field overlaps ${record.major}.`
          : `No clear overlap between your major and ${record.major}.`,
    },
  ];
}
