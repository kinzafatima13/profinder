import type { ProfessorInput, UniversityInput } from "../src/lib/importer/types";

export type AcademicValidationIssue = {
  severity: "error" | "warning";
  record: string;
  field: string;
  message: string;
  value?: string;
};

export type AcademicValidationReport = {
  valid: boolean;
  checkedUniversities: number;
  checkedProfessors: number;
  checkedPrograms: number;
  checkedScholarships: number;
  errors: number;
  warnings: number;
  issues: AcademicValidationIssue[];
};

const trustedAcademicHosts = [
  "openalex.org",
  "orcid.org",
  "semanticscholar.org",
  "crossref.org",
  "doi.org",
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "campuschina.org",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isAcademicSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return (
      hostname.endsWith(".edu") ||
      /\.edu\.[a-z]{2}$/i.test(hostname) ||
      /\.ac\.[a-z]{2}$/i.test(hostname) ||
      hostname.endsWith(".gov") ||
      /\.gov\.[a-z]{2}$/i.test(hostname) ||
      trustedAcademicHosts.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`)
      )
    );
  } catch {
    return false;
  }
}

export function validateAcademicDataset(
  universityData: unknown,
  professorData: unknown,
  defaultCountry?: string
): AcademicValidationReport {
  const issues: AcademicValidationIssue[] = [];
  const universities = Array.isArray(universityData) ? universityData : [];
  const professors = Array.isArray(professorData) ? professorData : [];
  let checkedPrograms = 0;
  let checkedScholarships = 0;

  const addIssue = (
    severity: AcademicValidationIssue["severity"],
    record: string,
    field: string,
    message: string,
    value?: string
  ) => issues.push({ severity, record, field, message, ...(value ? { value } : {}) });

  if (!Array.isArray(universityData)) {
    addIssue("error", "dataset", "universities", "Expected a JSON array of universities");
  }
  if (!Array.isArray(professorData)) {
    addIssue("error", "dataset", "professors", "Expected a JSON array of professors");
  }

  const validateProvenance = (
    record: string,
    field: string,
    value: unknown,
    required: boolean
  ) => {
    const sourceUrl = getText(value);
    if (!sourceUrl) {
      if (required) {
        addIssue("error", record, field, "A verifiable source URL is required");
      }
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      addIssue("error", record, field, "Source URL must be an absolute HTTPS URL");
      return;
    }

    if (parsed.username || parsed.password) {
      addIssue("error", record, field, "Source URL must not embed credentials");
      return;
    }
    if (parsed.protocol !== "https:") {
      addIssue("error", record, field, "Source URL must use HTTPS");
      return;
    }
    if (!isAcademicSourceUrl(sourceUrl)) {
      addIssue(
        "warning",
        record,
        field,
        "Source host is not a recognized academic, university, or government domain; verify it manually",
        sourceUrl
      );
      return;
    }
    if (parsed.pathname === "/" && !parsed.search && !parsed.hash) {
      addIssue(
        "warning",
        record,
        field,
        "Source points to a domain homepage rather than a record-specific page; verify record-level provenance",
        sourceUrl
      );
    }
  };

  const universityNames = new Set<string>();
  universities.forEach((value: unknown, index: number) => {
    const record = `universities[${index}]`;
    if (!isRecord(value)) {
      addIssue("error", record, "record", "Expected an object");
      return;
    }

    const name = getText(value.name);
    if (!name) {
      addIssue("error", record, "name", "University name is required");
    } else {
      universityNames.add(name.toLocaleLowerCase());
    }
    if (!getText(value.country) && !getText(defaultCountry)) {
      addIssue("error", record, "country", "University country is required; do not infer a location");
    }

    const source = value.sourceUrl ?? value.officialUrl;
    validateProvenance(record, "sourceUrl", source, true);

    const programs = value.programs === undefined ? [] : value.programs;
    if (!Array.isArray(programs)) {
      addIssue("error", record, "programs", "Expected an array of programs");
    } else {
      programs.forEach((program: unknown, programIndex: number) => {
        checkedPrograms++;
        const programRecord = `${record}.programs[${programIndex}]`;
        if (!isRecord(program)) {
          addIssue("error", programRecord, "record", "Expected an object");
          return;
        }
        if (!getText(program.degree)) {
          addIssue("error", programRecord, "degree", "Program degree is required");
        }
        if (!getText(program.major)) {
          addIssue("error", programRecord, "major", "Program major is required");
        }
        validateProvenance(
          programRecord,
          "sourceUrl",
          program.sourceUrl ?? program.programUrl,
          true
        );
      });
    }

    const scholarships = value.scholarships === undefined ? [] : value.scholarships;
    if (!Array.isArray(scholarships)) {
      addIssue("error", record, "scholarships", "Expected an array of scholarships");
    } else {
      scholarships.forEach((scholarship: unknown, scholarshipIndex: number) => {
        checkedScholarships++;
        const scholarshipRecord = `${record}.scholarships[${scholarshipIndex}]`;
        if (!isRecord(scholarship)) {
          addIssue("error", scholarshipRecord, "record", "Expected an object");
          return;
        }
        if (!getText(scholarship.name)) {
          addIssue("error", scholarshipRecord, "name", "Scholarship name is required");
        }
        validateProvenance(
          scholarshipRecord,
          "officialUrl",
          scholarship.officialUrl,
          true
        );
      });
    }

    const universityProfessors = value.professors === undefined ? [] : value.professors;
    if (!Array.isArray(universityProfessors)) {
      addIssue("error", record, "professors", "Expected an array of professors");
    } else {
      universityProfessors.forEach((professor: unknown, professorIndex: number) => {
        validateProfessor(
          professor,
          `${record}.professors[${professorIndex}]`,
          validateProvenance,
          addIssue
        );
      });
    }
  });

  professors.forEach((value: unknown, index: number) => {
    const record = `professors[${index}]`;
    if (!isRecord(value)) {
      addIssue("error", record, "record", "Expected an object");
      return;
    }
    validateProfessor(value, record, validateProvenance, addIssue);
    const universityName = getText(value.university);
    if (!universityName) {
      addIssue("error", record, "university", "Professor must reference a university by name");
    } else if (!universityNames.has(universityName.toLocaleLowerCase())) {
      addIssue(
        "error",
        record,
        "university",
        "Professor references a university absent from the university input file",
        universityName
      );
    }
  });

  const errors = issues.filter((issue) => issue.severity === "error").length;
  return {
    valid: errors === 0,
    checkedUniversities: universities.length,
    checkedProfessors:
      professors.length +
      universities.reduce((count: number, value: unknown) => {
        return count + (isRecord(value) && Array.isArray(value.professors) ? value.professors.length : 0);
      }, 0),
    checkedPrograms,
    checkedScholarships,
    errors,
    warnings: issues.length - errors,
    issues,
  };
}

function validateProfessor(
  value: unknown,
  record: string,
  validateProvenance: (
    record: string,
    field: string,
    value: unknown,
    required: boolean
  ) => void,
  addIssue: (
    severity: AcademicValidationIssue["severity"],
    record: string,
    field: string,
    message: string,
    value?: string
  ) => void
): void {
  if (!isRecord(value)) {
    addIssue("error", record, "record", "Expected an object");
    return;
  }
  if (!getText(value.name)) {
    addIssue("error", record, "name", "Professor name is required");
  }
  validateProvenance(
    record,
    "sourceUrl",
    value.sourceUrl ?? value.profileUrl,
    true
  );
}

export function toUniversityInputs(value: unknown): UniversityInput[] {
  if (!Array.isArray(value)) return [];
  return value as UniversityInput[];
}

export function toProfessorInputs(
  value: unknown
): (ProfessorInput & { university: string })[] {
  if (!Array.isArray(value)) return [];
  return value as (ProfessorInput & { university: string })[];
}
