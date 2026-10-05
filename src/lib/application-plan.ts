export const COMMON_DOCUMENTS = [
  "Passport",
  "Degree certificate",
  "Transcript",
  "CV",
  "Research proposal",
  "Recommendation letters",
  "English test report",
  "Application form",
] as const;

const MOVED_ON = new Set([
  "Contacted",
  "Follow-up",
  "Replied",
  "Interested",
  "Application Started",
  "Application Submitted",
  "Accepted",
]);

export function parseDocuments(value: string | null | undefined) {
  const state = Object.fromEntries(COMMON_DOCUMENTS.map((name) => [name, "missing"])) as Record<string, "done" | "missing">;
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, unknown>;
    for (const name of COMMON_DOCUMENTS) {
      if (parsed[name] === "done") state[name] = "done";
    }
  } catch {
    // An unreadable saved value stays as missing.
  }
  return state;
}

export function applicationPlan(input: {
  hasProfile: boolean;
  hasEnglish: boolean;
  hasTarget: boolean;
  status: string | null;
  documents: Record<string, "done" | "missing">;
}) {
  const doneCount = Object.values(input.documents).filter((item) => item === "done").length;
  const steps = [
    {
      title: "Complete your profile",
      done: input.hasProfile && input.hasEnglish,
      detail: input.hasEnglish ? "Degree, interests, and English test are on the profile." : "Add your degree, major, interests, CGPA, and English test on the profile.",
    },
    {
      title: "Save a professor, program, or scholarship",
      done: input.hasTarget,
      detail: input.hasTarget ? "A target is on the tracker." : "Save one from Professors or Scholarships.",
    },
    {
      title: "Confirm the official page",
      done: false,
      detail: "Open the university or faculty page yourself. Stored deadlines are not official.",
    },
    {
      title: "Contact the professor",
      done: MOVED_ON.has(input.status || ""),
      detail: "Draft the email, review it, then record the status after you send it.",
    },
    {
      title: "Mark documents",
      done: doneCount === COMMON_DOCUMENTS.length,
      detail: `${doneCount} of ${COMMON_DOCUMENTS.length} common materials are marked done. This is not the university's official list.`,
    },
    {
      title: "Submit",
      done: input.status === "Application Submitted" || input.status === "Accepted",
      detail: "Submit only after you confirm the deadline on the official site. This planner will not invent a date.",
    },
  ];
  const next = steps.find((step) => !step.done);
  return { steps, next: next ? `${next.title}. ${next.detail}` : "Record the outcome on this application." };
}

export function readinessScore(input: {
  hasProfile: boolean;
  hasEnglish: boolean;
  hasTarget: boolean;
  verifiedProfessor: boolean;
  hasEmail: boolean;
  documents: Record<string, "done" | "missing">;
}) {
  const doneCount = Object.values(input.documents).filter((item) => item === "done").length;
  const docScore = Math.round((doneCount / COMMON_DOCUMENTS.length) * 40);
  let score = docScore;
  const notes = [`Documents ${doneCount}/${COMMON_DOCUMENTS.length}.`];
  if (input.hasProfile) {
    score += 20;
    notes.push("Profile facts are saved.");
  } else notes.push("Profile facts are incomplete.");
  if (input.hasEnglish) {
    score += 10;
    notes.push("An English test note is saved. It was not checked against an official minimum.");
  } else notes.push("English proficiency is not on the profile.");
  if (input.hasTarget) {
    score += 10;
    notes.push("A target is saved.");
  } else notes.push("No professor, program, or scholarship is saved.");
  if (input.verifiedProfessor) {
    score += 10;
    notes.push("The professor is verified.");
  }
  if (input.hasEmail) {
    score += 10;
    notes.push("A professor email is stored.");
  }
  notes.push("Funding evidence is unknown, so it does not raise this score.");
  notes.push("The deadline is unverified, so it does not raise this score.");
  return { score: Math.min(100, score), notes };
}
