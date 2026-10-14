import { Prisma, PrismaClient } from "@prisma/client";
import {
  createCandidateReviewPlan,
  readCandidateRows,
} from "./candidate-review-dry-run";

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };

export type CandidateImportRecord = {
  candidateKey: string;
  openAlexId: string | null;
  orcid: string | null;
  name: string | null;
  sourceObservations: JsonObject[];
  candidateUniversityClaims: JsonObject[];
  reviewFlags: string[];
  matchedBy: string[];
  matchStatus: string;
  matchedProfessorId: string | null;
  dataStatus: "NEEDS_VERIFICATION";
  verificationStatus: "NEEDS_VERIFICATION";
  verificationOutcome: "PENDING";
};

type ExistingCandidate = Pick<
  CandidateImportRecord,
  "candidateKey" | "openAlexId" | "orcid" | "name" | "sourceObservations" | "candidateUniversityClaims"
>;

export type CandidateImportTransaction = {
  findExisting(candidateKeys: string[]): Promise<ExistingCandidate[]>;
  createMany(args: {
    data: CandidateImportRecord[];
    skipDuplicates: true;
  }): Promise<{ count: number }>;
};

export type CandidateImportStore = {
  transaction<T>(operation: (transaction: CandidateImportTransaction) => Promise<T>): Promise<T>;
};

export type CandidateImportResult = {
  plannedRecords: number;
  unchangedExistingRecords: number;
  insertedRecords: number;
  concurrentExistingRecords: number;
};

export function assertExpectedNeonTarget(databaseUrl: string, expectedTarget: string | undefined): void {
  if (!expectedTarget?.trim()) {
    throw new Error(
      "Refusing to run: provide --expected-target=<Neon endpoint ID>/<database name>.",
    );
  }

  let configuredTarget: string;
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("invalid protocol");
    }
    const hostParts = url.hostname.toLowerCase().split(".");
    const endpointLabel = hostParts[0];
    if (
      hostParts.length < 3 ||
      !url.hostname.toLowerCase().endsWith(".neon.tech") ||
      !endpointLabel.startsWith("ep-")
    ) {
      throw new Error("not a recognized Neon endpoint");
    }
    const endpointId = endpointLabel.replace(/-pooler$/, "");
    const databaseName = decodeURIComponent(url.pathname.slice(1));
    if (!databaseName || databaseName.includes("/")) {
      throw new Error("invalid database name");
    }
    configuredTarget = `${endpointId}/${databaseName}`;
  } catch {
    throw new Error(
      "Refusing to run: DATABASE_URL must identify a valid Neon endpoint and database; its value was not displayed.",
    );
  }

  if (expectedTarget.trim() !== configuredTarget) {
    throw new Error(
      "Refusing to run: --expected-target does not match the configured Neon endpoint and database.",
    );
  }
}

function jsonValue(value: unknown, path: string): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => jsonValue(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const result: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = jsonValue(item, `${path}.${key}`);
    }
    return result;
  }
  throw new Error(`${path} contains a value that cannot be stored as JSON`);
}

function jsonObjectArray(value: unknown, path: string): JsonObject[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.map((item, index) => {
    const normalized = jsonValue(item, `${path}[${index}]`);
    if (!normalized || Array.isArray(normalized) || typeof normalized !== "object") {
      throw new Error(`${path}[${index}] must be an object`);
    }
    return normalized;
  });
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${path} must be an array of strings`);
  }
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${path} must be a string or null`);
  return value;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createCandidateImportRecords(
  sourceRows: Record<string, unknown>[],
  professors: Array<{ id: string; openAlexId: string | null; orcid: string | null }>,
): CandidateImportRecord[] {
  const plan = createCandidateReviewPlan(sourceRows, professors);
  const manifest = plan.manifest as {
    candidateRecords: Array<Record<string, unknown>>;
  };
  const records = manifest.candidateRecords.map((candidate, index): CandidateImportRecord => ({
    candidateKey: nullableString(candidate.candidateKey, `candidate ${index + 1} key`) ?? "",
    openAlexId: nullableString(candidate.openAlexId, `candidate ${index + 1} OpenAlex ID`),
    orcid: nullableString(candidate.orcid, `candidate ${index + 1} ORCID`),
    name: nullableString(candidate.name, `candidate ${index + 1} name`),
    sourceObservations: jsonObjectArray(candidate.sourceObservations, `candidate ${index + 1} observations`),
    candidateUniversityClaims: jsonObjectArray(
      candidate.candidateUniversityClaims,
      `candidate ${index + 1} university claims`,
    ),
    reviewFlags: stringArray(candidate.reviewFlags, `candidate ${index + 1} review flags`),
    matchedBy: stringArray(candidate.matchBy, `candidate ${index + 1} match identifiers`),
    matchStatus: nullableString(candidate.matchStatus, `candidate ${index + 1} match status`) ?? "",
    matchedProfessorId: nullableString(
      candidate.matchedProfessorId,
      `candidate ${index + 1} matched professor ID`,
    ),
    dataStatus: "NEEDS_VERIFICATION",
    verificationStatus: "NEEDS_VERIFICATION",
    verificationOutcome: "PENDING",
  }));

  const keys = new Set<string>();
  for (const record of records) {
    if (!record.candidateKey) throw new Error("Candidate identity key cannot be empty");
    if (keys.has(record.candidateKey)) {
      throw new Error(`Duplicate candidate identity key in import plan: ${record.candidateKey}`);
    }
    keys.add(record.candidateKey);
  }
  return records;
}

function hasSameSource(existing: ExistingCandidate, incoming: CandidateImportRecord): boolean {
  return existing.openAlexId === incoming.openAlexId &&
    existing.orcid === incoming.orcid &&
    existing.name === incoming.name &&
    stableJson(existing.sourceObservations) === stableJson(incoming.sourceObservations) &&
    stableJson(existing.candidateUniversityClaims) === stableJson(incoming.candidateUniversityClaims);
}

export async function importCandidateRecords(
  records: CandidateImportRecord[],
  store: CandidateImportStore,
  options: { apply: boolean; batchSize?: number },
): Promise<CandidateImportResult> {
  if (!options.apply) {
    throw new Error("Candidate import is disabled; explicit apply approval is required");
  }
  const batchSize = options.batchSize ?? 500;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Candidate import batch size must be a positive integer");
  }

  const keys = new Set<string>();
  for (const record of records) {
    if (keys.has(record.candidateKey)) {
      throw new Error(`Duplicate candidate identity key in import plan: ${record.candidateKey}`);
    }
    keys.add(record.candidateKey);
    if (
      record.dataStatus !== "NEEDS_VERIFICATION" ||
      record.verificationStatus !== "NEEDS_VERIFICATION" ||
      record.verificationOutcome !== "PENDING"
    ) {
      throw new Error(`Candidate ${record.candidateKey} is not in the required review state`);
    }
  }

  return store.transaction(async (transaction) => {
    const existingByKey = new Map<string, ExistingCandidate>();
    for (let start = 0; start < records.length; start += batchSize) {
      const existing = await transaction.findExisting(
        records.slice(start, start + batchSize).map((record) => record.candidateKey),
      );
      for (const candidate of existing) existingByKey.set(candidate.candidateKey, candidate);
    }

    const newRecords: CandidateImportRecord[] = [];
    for (const record of records) {
      const existing = existingByKey.get(record.candidateKey);
      if (!existing) {
        newRecords.push(record);
      } else if (!hasSameSource(existing, record)) {
        throw new Error(
          `Existing candidate ${record.candidateKey} has different source data; refusing to overwrite or merge`,
        );
      }
    }

    let insertedRecords = 0;
    let concurrentExistingRecords = 0;
    for (let start = 0; start < newRecords.length; start += batchSize) {
      const batch = newRecords.slice(start, start + batchSize);
      const result = await transaction.createMany({
        data: batch,
        skipDuplicates: true,
      });
      insertedRecords += result.count;
      if (result.count < batch.length) {
        const afterInsert = await transaction.findExisting(batch.map((record) => record.candidateKey));
        const afterInsertByKey = new Map(afterInsert.map((record) => [record.candidateKey, record]));
        for (const incoming of batch) {
          const stored = afterInsertByKey.get(incoming.candidateKey);
          if (!stored) {
            throw new Error(
              `Candidate ${incoming.candidateKey} was skipped during insert but is missing on re-read; aborting transaction`,
            );
          }
          if (!hasSameSource(stored, incoming)) {
            throw new Error(
              `Candidate ${incoming.candidateKey} was concurrently inserted with conflicting identifiers or source data; aborting transaction`,
            );
          }
        }
        concurrentExistingRecords += batch.length - result.count;
      }
    }
    return {
      plannedRecords: records.length,
      unchangedExistingRecords: existingByKey.size,
      insertedRecords,
      concurrentExistingRecords,
    };
  });
}

function parseApplyArgs(args: string[]): string {
  const expectedArgument = args.find((argument) => argument.startsWith("--expected-target="));
  const expectedTarget = expectedArgument?.slice("--expected-target=".length);
  const allowed = new Set(["--apply", "--confirm-candidate-import"]);
  if (
    args.length !== allowed.size + 1 ||
    args.some((argument) => argument !== expectedArgument && !allowed.has(argument)) ||
    args.filter((argument) => argument === "--apply").length !== 1 ||
    args.filter((argument) => argument === "--confirm-candidate-import").length !== 1 ||
    !expectedTarget?.trim()
  ) {
    throw new Error(
      "Refusing to run. Supply --apply, --confirm-candidate-import, and --expected-target=<Neon endpoint ID>/<database name>.",
    );
  }
  return expectedTarget;
}

async function runCandidateImport() {
  const expectedTarget = parseApplyArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Refusing to run: DATABASE_URL is not configured; no credentials were displayed.");
  }
  assertExpectedNeonTarget(databaseUrl, expectedTarget);
  const candidates = readCandidateRows("data/anhui-review-20261013-122334/unique-candidates.json");
  const prisma = new PrismaClient();
  try {
    const professors = await prisma.professor.findMany({
      select: { id: true, openAlexId: true, orcid: true },
    });
    const records = createCandidateImportRecords(candidates, professors);
    const result = await importCandidateRecords(records, {
      transaction: (operation) => prisma.$transaction(
        (transaction) => operation({
          findExisting: async (candidateKeys) => {
            const existing = await transaction.professorCandidate.findMany({
              where: { candidateKey: { in: candidateKeys } },
              select: {
                candidateKey: true,
                openAlexId: true,
                orcid: true,
                name: true,
                sourceObservations: true,
                candidateUniversityClaims: true,
              },
            });
            return existing as ExistingCandidate[];
          },
          createMany: ({ data, skipDuplicates }) => transaction.professorCandidate.createMany({
            data: data.map((record) => ({
              ...record,
              sourceObservations: record.sourceObservations as Prisma.InputJsonValue,
              candidateUniversityClaims: record.candidateUniversityClaims as Prisma.InputJsonValue,
              reviewFlags: record.reviewFlags as Prisma.InputJsonValue,
              matchedBy: record.matchedBy as Prisma.InputJsonValue,
            })),
            skipDuplicates,
          }),
        }),
        { maxWait: 10_000, timeout: 120_000 },
      ),
    }, { apply: true });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runCandidateImport().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Candidate import failed");
    process.exitCode = 1;
  });
}
