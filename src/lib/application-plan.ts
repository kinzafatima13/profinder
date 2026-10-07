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

export const OPTIONAL_DOCUMENTS = [
  "Statement of purpose",
  "Portfolio",
  "Certificates",
  "Other",
] as const;

const MOVED_ON = new Set([
  "Contacted",
  "Sent",
  "Waiting",
  "Follow-up",
  "Replied",
  "Interested",
  "Application Started",
  "Application Submitted",
  "Accepted",
  "Rejected",
  "Withdrawn",
]);

export function parseDocuments(value: string | null | undefined) {
  const names = [...COMMON_DOCUMENTS, ...OPTIONAL_DOCUMENTS];
  const state = Object.fromEntries(names.map((name) => [name, "missing"])) as Record<string, "done" | "missing">;
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, unknown>;
    for (const name of names) {
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
  const doneCount = COMMON_DOCUMENTS.filter((name) => input.documents[name] === "done").length;
  const steps = [
    {
      title: "Complete your profile",
      done: input.hasProfile,
      detail: "Degree and research interests are enough to start. English test, GPA, and funding preference are optional.",
    },
    {
      title: "Save a program, scholarship, or supervisor",
      done: input.hasTarget,
      detail: input.hasTarget ? "A target is on the tracker." : "Save one from Programs, Scholarships, or Professors. A supervisor is optional.",
    },
    {
      title: "Confirm the official page",
      done: false,
      detail: "Open the official source yourself. Stored deadlines are not official.",
    },
    {
      title: "Contact a supervisor, if this opportunity needs one",
      done: MOVED_ON.has(input.status || ""),
      detail: "Draft, review, and send it yourself. Then record the status. Master's programs may not need this step.",
    },
    {
      title: "Mark documents you actually have",
      done: false,
      detail: `${doneCount} of ${COMMON_DOCUMENTS.length} common materials are marked. They are not required for every discipline. Portfolio and certificates stay optional.`,
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
  const doneCount = COMMON_DOCUMENTS.filter((name) => input.documents[name] === "done").length;
  const docScore = Math.round((doneCount / COMMON_DOCUMENTS.length) * 30);
  let score = docScore;
  const notes = [`Common documents marked ${doneCount}/${COMMON_DOCUMENTS.length}. This is not an official requirement list.`];
  if (input.hasProfile) {
    score += 25;
    notes.push("Profile facts are saved.");
  } else notes.push("Profile facts are incomplete.");
  if (input.hasEnglish) {
    score += 10;
    notes.push("An English test note is saved. It was not checked against an official minimum.");
  } else notes.push("English proficiency is not on the profile.");
  if (input.hasTarget) {
    score += 15;
    notes.push("A target is saved.");
  } else notes.push("No program, scholarship, or supervisor is saved.");
  if (input.verifiedProfessor) {
    score += 10;
    notes.push("A linked supervisor is verified.");
  }
  if (input.hasEmail) {
    score += 10;
    notes.push("A public email is stored.");
  }
  notes.push("Funding evidence is unknown, so it does not raise this score.");
  notes.push("The deadline is unverified, so it does not raise this score.");
  return { score: Math.min(100, score), notes };
}
