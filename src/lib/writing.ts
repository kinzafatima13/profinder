export function draftSop(input: {
  studentName?: string | null;
  studentDegree?: string | null;
  studentMajor?: string | null;
  studentInterests?: string | null;
  studentBackground?: string | null;
  studentProjects?: string | null;
  studentSkills?: string | null;
  englishTest?: string | null;
  professorName: string;
  universityName: string;
  programName?: string | null;
  professorInterests?: string | null;
  researchAreas?: string[];
  storedPaper?: string | null;
}) {
  const missing: string[] = [];
  if (!input.studentName?.trim()) missing.push("name");
  if (!input.studentDegree?.trim()) missing.push("degree");
  if (!input.studentMajor?.trim()) missing.push("major");
  if (!input.studentInterests?.trim()) missing.push("research interests");
  const focus = input.professorInterests?.trim() || input.researchAreas?.slice(0, 3).join(", ") || "No professor research summary is stored.";
  const paper = input.storedPaper?.trim();
  return {
    missing,
    title: `Statement of purpose for ${input.professorName} at ${input.universityName}`,
    disclaimer: "Draft from your saved profile and this professor's stored research. Edit it before you submit. It does not add achievements that are not on your profile.",
    sections: [
      {
        heading: "Who you are",
        text: `${input.studentName || "Name missing"} is applying for a ${input.studentDegree || "degree"} in ${input.studentMajor || "major not saved"}${input.programName ? `, program note: ${input.programName}` : ""} at ${input.universityName}.`,
      },
      {
        heading: "Your background",
        text: [
          input.studentBackground?.trim() ? input.studentBackground.trim() : "No academic background is saved.",
          input.studentProjects?.trim() ? `Projects on file: ${input.studentProjects.trim()}.` : "No projects are saved.",
          input.studentSkills?.trim() ? `Skills on file: ${input.studentSkills.trim()}.` : "No skills are saved.",
          input.englishTest?.trim() ? `English test on file: ${input.englishTest.trim()}.` : "No English test is saved.",
        ].join(" "),
      },
      {
        heading: "Why this professor",
        text: `Stored research for ${input.professorName}: ${focus}. Your saved interests: ${input.studentInterests || "none"}. ${paper ? `A stored title is “${paper}”. Do not claim you have read it unless you have.` : "No publication title is stored, so none is cited."}`,
      },
      {
        heading: "What you still need to write",
        text: "Replace the connection above with a specific question you can defend. Do not add grades, papers, or jobs that are not already on your profile.",
      },
    ],
  };
}

export function draftFollowUp(input: {
  studentName?: string | null;
  professorName: string;
  universityName: string;
  studentInterests?: string | null;
  professorInterests?: string | null;
  notes?: string | null;
  followUpDate?: string | null;
}) {
  const missing: string[] = [];
  if (!input.studentName?.trim()) missing.push("name");
  if (!input.studentInterests?.trim()) missing.push("research interests");
  const last = input.professorName.trim().split(/\s+/).slice(-1)[0];
  const dated = input.followUpDate?.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
  const elapsed = dated
    ? `The follow-up date saved on the tracker is ${dated}.`
    : "The number of days since the first email is not stored, so this draft does not say how long it has been.";
  const original = input.notes?.trim()
    ? `The note saved on the tracker is: ${input.notes.trim()}.`
    : "No original email is saved on the tracker, so this draft does not quote one.";
  const focus = input.professorInterests?.trim() || "the research summary stored on the profile";
  return {
    missing,
    subject: `Follow-up — ${input.studentInterests?.split(",")[0]?.trim() || input.universityName}`,
    body: `Dear Professor ${last},

I am ${input.studentName || ""}. I wrote earlier about ${input.studentInterests?.trim() || "my research interests"} and your work on ${focus} at ${input.universityName}.

${original}
${elapsed}

I am still interested in a short reply about whether supervision is possible. I will not continue to write if now is not a good time.

Thank you,
${input.studentName || ""}`,
    facts: [original, elapsed, `Professor research on file: ${focus}`],
  };
}
