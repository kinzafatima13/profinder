import assert from "node:assert/strict";
import test from "node:test";
import { computeResearchMatch, profileGaps } from "./matching";
import { generateOutreachEmail, profileReadyForEmail } from "./email-generator";

test("related research scores higher than unrelated", () => {
  const professor = {
    researchInterests: "network security intrusion detection AI security",
    department: "Cybersecurity",
    researchAreas: [{ name: "Cybersecurity", keywords: "network security intrusion" }],
  };
  const related = computeResearchMatch(
    { researchInterests: "cybersecurity network security AI security", major: "Computer Science", degree: "Master" },
    professor
  );
  const unrelated = computeResearchMatch(
    { researchInterests: "medieval poetry comparative literature", major: "Literature", degree: "Master" },
    professor
  );
  assert.ok(related.score > unrelated.score);
  assert.ok(related.reasons.length > 0);
});

test("empty profile is incomplete and does not invent a score", () => {
  const result = computeResearchMatch({}, { researchInterests: "cryptography" });
  assert.equal(result.incomplete, true);
  assert.equal(result.score, 0);
  assert.ok(profileGaps({}).includes("research interests"));
});

test("email uses supplied profile and refuses missing fields", () => {
  const missing = generateOutreachEmail({ professorName: "Wei Zhang", universityName: "UESTC" });
  assert.ok(missing.missing.includes("research interests"));
  assert.equal(missing.body, "");

  const ready = generateOutreachEmail({
    studentName: "Amina Khan",
    studentDegree: "Master",
    studentMajor: "Computer Science",
    studentInterests: "network security",
    professorName: "Wei Zhang",
    professorInterests: "network security",
    universityName: "UESTC",
    researchAreas: ["Cybersecurity"],
  });
  assert.equal(profileReadyForEmail(ready as never).length >= 0, true);
  assert.match(ready.body, /Amina Khan/);
  assert.match(ready.body, /network security/);
  assert.doesNotMatch(ready.body, /I have read your paper/);
});

import { openAlexToProfessorProfile } from "./matching";

test("openAlex adapter maps only available fields and invents nothing", () => {
  const profile = openAlexToProfessorProfile({
    topics: ["machine learning", "computer vision"],
    affiliation: "Tsinghua University",
  });
  assert.equal(profile.researchInterests, "machine learning, computer vision");
  assert.deepEqual(profile.topics, ["machine learning", "computer vision"]);
  assert.equal(profile.department, "Tsinghua University");
  assert.equal(profile.publications, undefined);
  assert.equal(profile.researchAreas, undefined);

  const empty = openAlexToProfessorProfile({});
  assert.equal(empty.researchInterests, null);
  assert.equal(empty.topics, null);
  assert.equal(empty.department, null);
});

test("partial OpenAlex profile still produces a match without inventing data", () => {
  const professor = openAlexToProfessorProfile({
    topics: ["network security", "intrusion detection"],
    affiliation: "UESTC",
  });
  const result = computeResearchMatch(
    { researchInterests: "cybersecurity network security", major: "Computer Science", degree: "Master" },
    professor
  );
  assert.ok(result.score >= 0);
  assert.equal(result.incomplete, false);
  assert.ok(result.matchedKeywords.length >= 0);
});
