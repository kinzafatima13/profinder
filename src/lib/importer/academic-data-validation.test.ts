import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAcademicSourceUrl,
  validateAcademicDataset,
} from "../../../scripts/academic-data-validation";
import { runAcademicImportCommand } from "./command";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("recognizes HTTPS university and academic source hosts", () => {
  assert.equal(isAcademicSourceUrl("https://www.example.edu/faculty"), true);
  assert.equal(isAcademicSourceUrl("https://person.example.edu.cn/profile"), true);
  assert.equal(isAcademicSourceUrl("https://openalex.org/A123"), true);
  assert.equal(isAcademicSourceUrl("http://www.example.edu/profile"), false);
  assert.equal(isAcademicSourceUrl("https://example.com/profile"), false);
  assert.equal(isAcademicSourceUrl("https://example.edu.evil.com/profile"), false);
});

test("reports missing and malformed academic provenance with record locations", () => {
  const report = validateAcademicDataset(
    [
      {
        name: "validation fixture",
        country: "validation fixture",
        sourceUrl: "http://example.edu/source",
        programs: [
          { degree: "Degree", major: "Major", programUrl: "https://example.com/program" },
        ],
      },
    ],
    []
  );

  assert.equal(report.valid, false);
  assert.equal(report.errors, 1);
  assert.equal(report.warnings, 1);
  assert.match(report.issues[0].message, /HTTPS/);
  assert.match(report.issues[1].message, /not a recognized academic/);
});

test("dry-run validates local files without invoking the database importer", async () => {
  const directory = mkdtempSync(join(tmpdir(), "profinder-academic-dry-run-"));
  const inputPath = join(directory, "universities.json");
  writeFileSync(inputPath, "[]", "utf8");
  let importerInvocations = 0;
  const output: string[] = [];

  try {
    const report = await runAcademicImportCommand(
      ["--dry-run", `--file=${inputPath}`],
      directory,
      async () => {
        importerInvocations++;
      },
      (line) => output.push(line)
    );

    assert.equal(report.valid, true);
    assert.equal(importerInvocations, 0);
    assert.ok(output.some((line) => line.includes("no database connection or writes are performed")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("import requires an explicit apply option and validation errors block it", async () => {
  const directory = mkdtempSync(join(tmpdir(), "profinder-academic-import-"));
  const inputPath = join(directory, "universities.json");
  writeFileSync(inputPath, JSON.stringify([{ name: "invalid fixture" }]), "utf8");
  let importerInvocations = 0;

  try {
    await assert.rejects(
      runAcademicImportCommand(
        ["--apply", `--file=${inputPath}`],
        directory,
        async () => {
          importerInvocations++;
        },
        () => {}
      ),
      /validation failed/
    );
    assert.equal(importerInvocations, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
