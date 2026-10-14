import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CandidateImportRecord,
  CandidateImportStore,
  CandidateImportTransaction,
  assertExpectedNeonTarget,
  createCandidateImportRecords,
  importCandidateRecords,
} from "./import-professor-candidates";

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    name: "Example Researcher",
    openAlexId: "https://openalex.org/A100",
    orcid: "https://orcid.org/0000-0001-2345-6789",
    candidateUniversities: ["Example University"],
    sourceFolders: ["example-batch"],
    sourceUrl: "https://openalex.org/A100",
    dataSource: "OpenAlex",
    ...overrides,
  };
}

class MemoryCandidateStore implements CandidateImportStore {
  readonly rows = new Map<string, CandidateImportRecord>();
  beforeCreate?: (record: CandidateImportRecord, store: MemoryCandidateStore) => void;

  async transaction<T>(operation: (transaction: CandidateImportTransaction) => Promise<T>): Promise<T> {
    const pending = new Map(this.rows);
    const transaction: CandidateImportTransaction = {
      findExisting: async (keys) => keys.flatMap((key) => {
        const existing = pending.get(key) ?? this.rows.get(key);
        return existing ? [{
          candidateKey: existing.candidateKey,
          openAlexId: existing.openAlexId,
          orcid: existing.orcid,
          name: existing.name,
          sourceObservations: existing.sourceObservations,
          candidateUniversityClaims: existing.candidateUniversityClaims,
        }] : [];
      }),
      createMany: async ({ data }) => {
        let count = 0;
        for (const record of data) {
          this.beforeCreate?.(record, this);
          if (pending.has(record.candidateKey) || this.rows.has(record.candidateKey)) continue;
          pending.set(record.candidateKey, record);
          count += 1;
        }
        return { count };
      },
    };
    const result = await operation(transaction);
    for (const [key, value] of pending) this.rows.set(key, value);
    return result;
  }
}

test("requires the expected endpoint and database confirmation", () => {
  const databaseUrl = "postgresql://user:password@ep-expected-123.us-east-2.aws.neon.tech/profinder";

  assert.throws(
    () => assertExpectedNeonTarget(databaseUrl, undefined),
    /provide --expected-target/,
  );
  assert.throws(
    () => assertExpectedNeonTarget(databaseUrl, "ep-other-456/profinder"),
    /does not match the configured Neon endpoint and database/,
  );
  assert.doesNotThrow(() => assertExpectedNeonTarget(databaseUrl, "ep-expected-123/profinder"));
  assert.doesNotThrow(
    () => assertExpectedNeonTarget(
      "postgresql://user:password@ep-expected-123-pooler.us-east-2.aws.neon.tech/profinder",
      "ep-expected-123/profinder",
    ),
  );
});

test("keeps duplicate-ORCID candidates separate and flags both for review", () => {
  const records = createCandidateImportRecords([
    candidate({ openAlexId: "A100" }),
    candidate({ openAlexId: "A200" }),
  ], []);

  assert.equal(records.length, 2);
  assert.notEqual(records[0].candidateKey, records[1].candidateKey);
  assert.ok(records.every((record) => record.orcid === "0000-0001-2345-6789"));
  assert.ok(records.every((record) =>
    record.reviewFlags.some((flag) => flag.includes("appears on multiple candidate records"))
  ));
  assert.ok(records.every((record) => record.dataStatus === "NEEDS_VERIFICATION"));
});

test("preserves candidates without an ORCID and keeps their review flag", () => {
  const [record] = createCandidateImportRecords([candidate({ orcid: null })], []);

  assert.equal(record.orcid, null);
  assert.equal(record.sourceObservations.length, 1);
  assert.ok(record.reviewFlags.includes("missing ORCID"));
});

test("stores a stable-ID match as a review link without creating a Professor", () => {
  const [record] = createCandidateImportRecords([candidate()], [
    { id: "professor-1", openAlexId: "A100", orcid: "0000-0001-2345-6789" },
  ]);
  const store = new MemoryCandidateStore();

  return importCandidateRecords([record], store, { apply: true }).then((result) => {
    assert.equal(result.insertedRecords, 1);
    assert.equal(store.rows.get(record.candidateKey)?.matchedProfessorId, "professor-1");
    assert.equal(store.rows.size, 1);
  });
});

test("reruns are idempotent and refuse changed source data without overwriting", async () => {
  const store = new MemoryCandidateStore();
  const [initial] = createCandidateImportRecords([candidate()], []);
  const firstRun = await importCandidateRecords([initial], store, { apply: true });
  const secondRun = await importCandidateRecords([initial], store, { apply: true });

  assert.equal(firstRun.insertedRecords, 1);
  assert.equal(secondRun.insertedRecords, 0);
  assert.equal(secondRun.unchangedExistingRecords, 1);
  assert.equal(store.rows.size, 1);

  const [changed] = createCandidateImportRecords([
    candidate({ researchInterests: "changed source payload" }),
  ], []);
  await assert.rejects(
    importCandidateRecords([changed], store, { apply: true }),
    /different source data; refusing to overwrite or merge/,
  );
  assert.deepEqual(store.rows.get(initial.candidateKey), initial);
});

test("accepts identical concurrent inserts after re-reading their payloads", async () => {
  const store = new MemoryCandidateStore();
  const [record] = createCandidateImportRecords([candidate()], []);
  store.beforeCreate = (incoming, target) => {
    target.beforeCreate = undefined;
    target.rows.set(incoming.candidateKey, incoming);
  };

  const result = await importCandidateRecords([record], store, { apply: true });

  assert.equal(result.insertedRecords, 0);
  assert.equal(result.unchangedExistingRecords, 0);
  assert.equal(result.concurrentExistingRecords, 1);
  assert.equal(store.rows.size, 1);
});

test("aborts on conflicting concurrent inserts and does not overwrite either row", async () => {
  const store = new MemoryCandidateStore();
  const [incoming] = createCandidateImportRecords([candidate()], []);
  const [conflict] = createCandidateImportRecords([
    candidate({ researchInterests: "different source data" }),
  ], []);
  store.beforeCreate = (_record, target) => {
    target.beforeCreate = undefined;
    target.rows.set(conflict.candidateKey, conflict);
  };

  await assert.rejects(
    importCandidateRecords([incoming], store, { apply: true }),
    /concurrently inserted with conflicting identifiers or source data; aborting transaction/,
  );
  assert.deepEqual(store.rows.get(incoming.candidateKey), conflict);
  assert.equal(store.rows.size, 1);
});

test("aborts if a skipped candidate is absent on the required re-read", async () => {
  const store = new MemoryCandidateStore();
  const [record] = createCandidateImportRecords([candidate()], []);
  store.beforeCreate = (_incoming, target) => {
    target.beforeCreate = undefined;
  };
  const transaction = store.transaction.bind(store);
  store.transaction = async (operation) => transaction(async (base) => operation({
    ...base,
    createMany: async () => ({ count: 0 }),
  }));

  await assert.rejects(
    importCandidateRecords([record], store, { apply: true }),
    /was skipped during insert but is missing on re-read; aborting transaction/,
  );
  assert.equal(store.rows.size, 0);
});

test("fails closed without explicit apply approval", async () => {
  const store = new MemoryCandidateStore();
  const [record] = createCandidateImportRecords([candidate()], []);

  await assert.rejects(
    importCandidateRecords([record], store, { apply: false }),
    /explicit apply approval is required/,
  );
  assert.equal(store.rows.size, 0);
});
