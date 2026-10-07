import assert from "node:assert/strict";
import test from "node:test";
import { extractProfile } from "./extract";
import { rankCandidate } from "./score";
import { resolveWeights } from "./weights";

test("extracts degree, country, and funding from a sentence", () => {
  const profile = extractProfile("I have a BS in Software Engineering and want a funded Master's in China focusing on AI for healthcare.");
  assert.equal(profile.targetDegree, "Master");
  assert.ok(profile.countries.includes("China"));
  assert.equal(profile.fundingRequired, true);
  assert.equal(profile.field, "Computer Science");
});

test("semantic concept match outranks an unrelated profile", () => {
  const profile = extractProfile("Using drones to detect crop diseases");
  const weights = resolveWeights("research");
  const related = rankCandidate(profile, candidate("precision agriculture remote sensing plant disease detection"), weights);
  const unrelated = rankCandidate(profile, candidate("medieval poetry comparative literature"), weights);
  assert.ok(related);
  assert.equal(unrelated, null);
  assert.ok((related?.score || 0) > 20);
  assert.match(related?.reasons.join(" ") || "", /precision agriculture|stored/i);
});

test("does not treat missing funding as available", () => {
  const profile = extractProfile("funded master's in chemistry");
  const weights = resolveWeights("funding");
  const match = rankCandidate(profile, candidate("chemistry catalysis"), weights);
  const funding = match?.scoreBreakdown.find((part) => part.key === "funding");
  assert.equal(funding?.score, null);
  assert.match(funding?.note || "", /not available/i);
});

function candidate(text: string) {
  return {
    professorId: "p1",
    professorName: "Stored Professor",
    position: "Professor",
    department: text,
    email: null,
    profileUrl: "https://example.edu/profile",
    researchInterests: text,
    researchKeywords: text,
    publications: null,
    publicationTitles: [],
    areas: [text],
    topics: [],
    verificationStatus: "UNVERIFIED",
    dataStatus: "unverified",
    sourceUrl: null,
    university: { id: "u1", name: "Stored University", country: "China", city: null, officialUrl: null, verificationStatus: "UNVERIFIED" },
    program: null,
    fundingOnFile: false,
    fundingNames: [],
  };
}
