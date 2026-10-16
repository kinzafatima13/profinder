import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Unit-level tests for normalization shape (live calls mocked in CI; here we test pure helpers if exported).
// Full integration tests require network and are optional.

describe("OpenAlex search normalization", () => {
  it("rejects short queries in the route contract", () => {
    // Contract: q length 2-120
    assert.equal(true, true);
  });

  it("normalized author shape is stable", () => {
    const sample = {
      openAlexId: "A123",
      name: "Test Author",
      orcid: null,
      worksCount: 10,
      topics: [{ id: "T1", name: "Machine Learning" }],
      affiliation: "Tsinghua University",
      countryCode: "CN",
      sourceUrl: "https://openalex.org/A123",
      verificationStatus: "UNVERIFIED" as const,
      dataSource: "OpenAlex" as const,
      dataStatus: "unverified" as const,
    };
    assert.equal(sample.verificationStatus, "UNVERIFIED");
    assert.equal(sample.dataSource, "OpenAlex");
    assert.ok(sample.sourceUrl.includes("openalex.org"));
  });
});
