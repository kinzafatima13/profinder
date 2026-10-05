export type AtsCheck = { label: string; score: number; note: string };

export function scoreResume(
  text: string,
  profile: { major?: string | null; interests?: string | null; skills?: string | null }
) {
  const lower = text.toLowerCase();
  const checks: AtsCheck[] = [];

  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  checks.push({
    label: "Contact",
    score: hasEmail ? 100 : 15,
    note: hasEmail ? "An email address is in the file." : "No email address was found.",
  });

  const education = /bachelor|master|ph\.?d|university|college|cgpa|gpa|degree/.test(lower);
  checks.push({
    label: "Education",
    score: education ? 100 : 20,
    note: education ? "Education wording is present." : "Add the degree, university, and CGPA.",
  });

  const experience = /project|experience|intern|research|developed|built/.test(lower);
  checks.push({
    label: "Experience",
    score: experience ? 100 : 25,
    note: experience ? "Projects or experience are mentioned." : "Add a project or role and what you did.",
  });

  const skillTerms = [...new Set((profile.skills || "").toLowerCase().split(/[^a-z0-9+.#]+/).filter((term) => term.length > 2))].slice(0, 12);
  const skillHits = skillTerms.filter((term) => lower.includes(term));
  checks.push({
    label: "Skills",
    score: skillTerms.length ? Math.round((skillHits.length / skillTerms.length) * 100) : /skill/.test(lower) ? 60 : 35,
    note: skillTerms.length ? `${skillHits.length} of ${skillTerms.length} profile skills appear in the file.` : "Save skills on your profile so they can be checked.",
  });

  const target = [...new Set(`${profile.major || ""} ${profile.interests || ""}`.toLowerCase().split(/[^a-z0-9+]+/).filter((term) => term.length > 3))].slice(0, 12);
  const targetHits = target.filter((term) => lower.includes(term));
  checks.push({
    label: "Target keywords",
    score: target.length ? Math.round((targetHits.length / target.length) * 100) : 40,
    note: target.length ? `Matched: ${targetHits.slice(0, 6).join(", ") || "none"}.` : "Add a major and research interests first.",
  });

  const lengthScore = text.length < 400 ? 30 : text.length > 7000 ? 75 : 100;
  checks.push({
    label: "Length",
    score: lengthScore,
    note: text.length < 400 ? "The extracted text is short." : text.length > 7000 ? "The text is long. Keep the strongest projects near the top." : "The length is usable.",
  });

  const score = Math.round(checks.reduce((sum, check) => sum + check.score, 0) / checks.length);
  return { score, checks };
}
