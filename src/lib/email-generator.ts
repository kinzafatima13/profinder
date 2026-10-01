export type EmailInput = {
  studentName?: string | null;
  studentDegree?: string | null;
  studentMajor?: string | null;
  studentBackground?: string | null;
  studentInterests?: string | null;
  studentSkills?: string | null;
  studentProjects?: string | null;
  professorName: string;
  professorPosition?: string | null;
  professorDepartment?: string | null;
  professorInterests?: string | null;
  universityName: string;
  researchAreas?: string[];
  publications?: string | null;
};

export function profileReadyForEmail(input: EmailInput): string[] {
  const missing: string[] = [];
  if (!input.studentName?.trim()) missing.push("name");
  if (!input.studentDegree?.trim()) missing.push("degree");
  if (!input.studentMajor?.trim()) missing.push("major");
  if (!input.studentInterests?.trim()) missing.push("research interests");
  return missing;
}

export function generateOutreachEmail(input: EmailInput): {
  subject: string;
  body: string;
  source: "template";
  missing: string[];
} {
  const missing = profileReadyForEmail(input);
  if (missing.length) {
    return {
      subject: "",
      body: "",
      source: "template",
      missing,
    };
  }

  const last = input.professorName.trim().split(/\s+/).slice(-1)[0];
  const areas = (input.researchAreas ?? []).slice(0, 3).join(", ");
  const profFocus = input.professorInterests?.trim() || areas || "your listed research areas";
  const overlap = input.studentInterests?.trim();
  const skills = input.studentSkills?.trim()
    ? ` Skills I can contribute include ${input.studentSkills.trim()}.`
    : "";
  const projects = input.studentProjects?.trim()
    ? ` Related work I can describe: ${input.studentProjects.trim()}.`
    : "";
  const background = input.studentBackground?.trim()
    ? ` Background: ${input.studentBackground.trim()}.`
    : "";
  const pubs = input.publications?.trim()
    ? " I have reviewed the research summary listed on this profile and would like to discuss how my interests connect."
    : "";

  const subject = `${input.studentDegree} inquiry — ${input.studentMajor} / ${overlap?.split(",")[0]?.trim()}`;

  const body = `Dear Professor ${last},

My name is ${input.studentName}. I am applying for a ${input.studentDegree} in ${input.studentMajor} at ${input.universityName} and am writing to ask whether you may be considering research students.

The overlap I see is between my interests (${overlap}) and your listed work on ${profFocus}${areas ? ` (${areas})` : ""}.${background}${skills}${projects}${pubs}

If supervision or a research discussion is possible, I can send a CV and a short research note. I will not send further messages unless you are open to it.

Thank you for your time.

Sincerely,
${input.studentName}`;

  return { subject, body, source: "template", missing: [] };
}
