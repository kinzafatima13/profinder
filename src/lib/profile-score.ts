export type ProfileFacts = {
  name?: string | null;
  degree?: string | null;
  major?: string | null;
  gpa?: string | null;
  englishTest?: string | null;
  researchInterests?: string | null;
  skills?: string | null;
  projects?: string | null;
  preferredCountries?: string | null;
  academicBackground?: string | null;
  publications?: string | null;
  researchExperience?: string | null;
  intake?: string | null;
  fundingPreference?: string | null;
};

const CHECKS: { key: keyof ProfileFacts; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "degree", label: "Degree" },
  { key: "major", label: "Major" },
  { key: "gpa", label: "CGPA" },
  { key: "englishTest", label: "English test" },
  { key: "researchInterests", label: "Research interests" },
  { key: "academicBackground", label: "Academic background" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "preferredCountries", label: "Preferred country" },
  { key: "publications", label: "Publications" },
  { key: "researchExperience", label: "Research experience" },
  { key: "intake", label: "Intake" },
  { key: "fundingPreference", label: "Funding preference" },
];

export function scoreProfile(profile: ProfileFacts) {
  const strengths = CHECKS.filter((item) => profile[item.key]?.trim()).map((item) => item.label);
  const gaps = CHECKS.filter((item) => !profile[item.key]?.trim()).map((item) => item.label);
  const score = Math.round((strengths.length / CHECKS.length) * 100);
  const next = gaps[0]
    ? `Add ${gaps[0].toLowerCase()} on this profile.`
    : "Profile facts are filled. Open Scholarships and use Am I eligible, or open Find Professors.";
  return { score, strengths, gaps, next };
}
