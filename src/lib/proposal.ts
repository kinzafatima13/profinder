export type ProposalInput = {
  studentName?: string | null;
  studentDegree?: string | null;
  studentMajor?: string | null;
  studentInterests?: string | null;
  studentBackground?: string | null;
  studentProjects?: string | null;
  studentSkills?: string | null;
  professorName: string;
  universityName: string;
  professorInterests?: string | null;
  researchAreas?: string[];
  storedPaper?: string | null;
};

export function draftProposal(input: ProposalInput) {
  const missing: string[] = [];
  if (!input.studentName?.trim()) missing.push("name");
  if (!input.studentDegree?.trim()) missing.push("degree");
  if (!input.studentMajor?.trim()) missing.push("major");
  if (!input.studentInterests?.trim()) missing.push("research interests");
  const interest = input.studentInterests?.split(",")[0]?.trim() || "the interest saved on the profile";
  const focus = input.professorInterests?.trim() || input.researchAreas?.slice(0, 3).join(", ") || "the research text stored on this profile";
  const paper = input.storedPaper?.trim();

  return {
    missing,
    title: paper ? `${interest}: a draft connected to stored work by ${input.professorName}` : `${interest}: a draft for ${input.professorName}`,
    disclaimer: "Assisted draft only. Not a submission. It does not cite a paper unless that title is already stored on this profile.",
    sections: [
      { heading: "Background", text: `${input.studentName || "The student"} is preparing a ${input.studentDegree || "degree"} application in ${input.studentMajor || "an unstated major"} at ${input.universityName}. Saved interests: ${input.studentInterests || "none"}. ${input.studentBackground?.trim() ? `Saved background: ${input.studentBackground.trim()}.` : "No academic background is saved."} ${input.studentProjects?.trim() ? `Saved projects: ${input.studentProjects.trim()}.` : "No projects are saved."} ${input.studentSkills?.trim() ? `Saved skills: ${input.studentSkills.trim()}.` : ""}` },
      { heading: "Problem", text: `The research text stored for ${input.professorName} is: ${focus}.` },
      { heading: "Gap", text: paper ? `A title stored on this profile is “${paper}”. This draft does not claim that paper was read.` : "No publication title is stored, so this draft does not cite a paper." },
      { heading: "Question", text: `How does ${interest} connect to the stored work of ${input.professorName}? Write the real question after reading the official page.` },
      { heading: "Method", text: "No method was copied from a paper. Replace this sentence with a method you can defend." },
      { heading: "Contribution", text: "Do not invent a contribution. Add one only after the official profile and a real paper have been read." },
    ],
  };
}
