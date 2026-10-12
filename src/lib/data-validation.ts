/**
 * PROFINDER Data Validation
 * Comprehensive validation suite for university, program, professor, and publication data
 * Produces detailed validation reports without modifying database
 */

import { PrismaClient } from "@prisma/client";

export interface ValidationIssue {
  level: "error" | "warning" | "info";
  entity: string;
  entityId: string;
  field?: string;
  message: string;
  value?: any;
}

export interface ValidationReport {
  timestamp: string;
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ValidationIssue[];
  summary: {
    universitiesChecked: number;
    professorsChecked: number;
    programsChecked: number;
    publicationsChecked: number;
    invalidRecords: number;
  };
  durationMs: number;
}

class DataValidator {
  private prisma: PrismaClient;
  private issues: ValidationIssue[] = [];
  private startTime = Date.now();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private addIssue(issue: ValidationIssue) {
    this.issues.push(issue);
  }

  private log(msg: string) {
    console.log(msg);
  }

  async validate(): Promise<ValidationReport> {
    this.log("\n🔍 Starting comprehensive data validation...\n");

    const summary = {
      universitiesChecked: 0,
      professorsChecked: 0,
      programsChecked: 0,
      publicationsChecked: 0,
      invalidRecords: 0,
    };

    // 1. Validate Universities
    try {
      this.log("Checking universities...");
      const universities = await this.prisma.university.findMany({
        select: {
          id: true,
          name: true,
          country: true,
          officialUrl: true,
          openAlexId: true,
        },
      });
      summary.universitiesChecked = universities.length;

      for (const uni of universities) {
        // Name validation
        if (!uni.name || uni.name.trim().length === 0) {
          this.addIssue({
            level: "error",
            entity: "University",
            entityId: uni.id,
            field: "name",
            message: "University name is empty or missing",
          });
          summary.invalidRecords++;
        }

        // Country validation
        if (!uni.country || uni.country.trim().length === 0) {
          this.addIssue({
            level: "warning",
            entity: "University",
            entityId: uni.id,
            field: "country",
            message: "University country is missing",
          });
        }

        // URL format validation
        if (uni.officialUrl && !isValidUrl(uni.officialUrl)) {
          this.addIssue({
            level: "warning",
            entity: "University",
            entityId: uni.id,
            field: "officialUrl",
            message: `Invalid URL format: "${uni.officialUrl}"`,
            value: uni.officialUrl,
          });
        }

        // OpenAlex ID format validation
        if (uni.openAlexId && !uni.openAlexId.startsWith("I")) {
          this.addIssue({
            level: "warning",
            entity: "University",
            entityId: uni.id,
            field: "openAlexId",
            message: `OpenAlex institution ID should start with 'I': "${uni.openAlexId}"`,
            value: uni.openAlexId,
          });
        }
      }
      this.log(`✓ Validated ${universities.length} universities\n`);
    } catch (err) {
      this.addIssue({
        level: "error",
        entity: "University",
        entityId: "batch",
        message: `Failed to validate universities: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // 2. Validate Professors
    try {
      this.log("Checking professors...");
      const professors = await this.prisma.professor.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          universityId: true,
          orcid: true,
          openAlexId: true,
          semanticScholarId: true,
          university: { select: { id: true } },
          _count: { select: { researchAreas: true } },
        },
      });
      summary.professorsChecked = professors.length;

      for (const prof of professors) {
        // Name validation
        if (!prof.name || prof.name.trim().length === 0) {
          this.addIssue({
            level: "error",
            entity: "Professor",
            entityId: prof.id,
            field: "name",
            message: "Professor name is empty or missing",
          });
          summary.invalidRecords++;
        }

        // Email format validation
        if (prof.email && !isValidEmail(prof.email)) {
          this.addIssue({
            level: "warning",
            entity: "Professor",
            entityId: prof.id,
            field: "email",
            message: `Invalid email format: "${prof.email}"`,
            value: prof.email,
          });
        }

        // ORCID format validation (should be XXXX-XXXX-XXXX-XXXX)
        if (prof.orcid && !/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(prof.orcid)) {
          this.addIssue({
            level: "warning",
            entity: "Professor",
            entityId: prof.id,
            field: "orcid",
            message: `Invalid ORCID format (should be XXXX-XXXX-XXXX-XXXX): "${prof.orcid}"`,
            value: prof.orcid,
          });
        }

        // OpenAlex ID format validation
        if (prof.openAlexId && !prof.openAlexId.startsWith("A")) {
          this.addIssue({
            level: "warning",
            entity: "Professor",
            entityId: prof.id,
            field: "openAlexId",
            message: `OpenAlex author ID should start with 'A': "${prof.openAlexId}"`,
            value: prof.openAlexId,
          });
        }

        // Semantic Scholar ID format validation (should be numeric)
        if (prof.semanticScholarId && !/^\d+$/.test(prof.semanticScholarId)) {
          this.addIssue({
            level: "warning",
            entity: "Professor",
            entityId: prof.id,
            field: "semanticScholarId",
            message: `Semantic Scholar ID should be numeric: "${prof.semanticScholarId}"`,
            value: prof.semanticScholarId,
          });
        }

        // Referential integrity check
        if (!prof.university || !prof.university.id) {
          this.addIssue({
            level: "error",
            entity: "Professor",
            entityId: prof.id,
            message: "Professor references non-existent university",
          });
          summary.invalidRecords++;
        }

        // Research areas check
        if (prof._count.researchAreas === 0) {
          this.addIssue({
            level: "info",
            entity: "Professor",
            entityId: prof.id,
            message: "Professor has no research areas assigned",
          });
        }
      }
      this.log(`✓ Validated ${professors.length} professors\n`);
    } catch (err) {
      this.addIssue({
        level: "error",
        entity: "Professor",
        entityId: "batch",
        message: `Failed to validate professors: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // 3. Validate Programs
    try {
      this.log("Checking programs...");
      const programs = await this.prisma.program.findMany({
        select: {
          id: true,
          degree: true,
          major: true,
          universityId: true,
          university: { select: { id: true } },
        },
      });
      summary.programsChecked = programs.length;

      for (const prog of programs) {
        // Degree validation
        if (!prog.degree || prog.degree.trim().length === 0) {
          this.addIssue({
            level: "warning",
            entity: "Program",
            entityId: prog.id,
            field: "degree",
            message: "Program degree is missing",
          });
        }

        // Major validation
        if (!prog.major || prog.major.trim().length === 0) {
          this.addIssue({
            level: "error",
            entity: "Program",
            entityId: prog.id,
            field: "major",
            message: "Program major is empty or missing",
          });
          summary.invalidRecords++;
        }

        // Referential integrity
        if (!prog.university || !prog.university.id) {
          this.addIssue({
            level: "error",
            entity: "Program",
            entityId: prog.id,
            message: "Program references non-existent university",
          });
          summary.invalidRecords++;
        }
      }
      this.log(`✓ Validated ${programs.length} programs\n`);
    } catch (err) {
      this.addIssue({
        level: "error",
        entity: "Program",
        entityId: "batch",
        message: `Failed to validate programs: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // 4. Validate Publications
    try {
      this.log("Checking publications...");
      const publications = await this.prisma.publication.findMany({
        select: {
          id: true,
          title: true,
          year: true,
          doi: true,
          professorId: true,
          professor: { select: { id: true } },
        },
      });
      summary.publicationsChecked = publications.length;

      for (const pub of publications) {
        // Title validation
        if (!pub.title || pub.title.trim().length === 0) {
          this.addIssue({
            level: "error",
            entity: "Publication",
            entityId: pub.id,
            field: "title",
            message: "Publication title is empty or missing",
          });
          summary.invalidRecords++;
        }

        // Year validation
        if (pub.year && (pub.year < 1900 || pub.year > new Date().getFullYear())) {
          this.addIssue({
            level: "warning",
            entity: "Publication",
            entityId: pub.id,
            field: "year",
            message: `Publication year is unrealistic: ${pub.year}`,
            value: pub.year,
          });
        }

        // DOI format validation
        if (pub.doi && !/^10\.\d{4,}\//.test(pub.doi)) {
          this.addIssue({
            level: "warning",
            entity: "Publication",
            entityId: pub.id,
            field: "doi",
            message: `DOI format appears invalid: "${pub.doi}"`,
            value: pub.doi,
          });
        }

        // Referential integrity
        if (!pub.professor || !pub.professor.id) {
          this.addIssue({
            level: "error",
            entity: "Publication",
            entityId: pub.id,
            message: "Publication references non-existent professor",
          });
          summary.invalidRecords++;
        }
      }
      this.log(`✓ Validated ${publications.length} publications\n`);
    } catch (err) {
      this.addIssue({
        level: "error",
        entity: "Publication",
        entityId: "batch",
        message: `Failed to validate publications: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    const durationMs = Date.now() - this.startTime;

    return {
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      errors: this.issues.filter((i) => i.level === "error").length,
      warnings: this.issues.filter((i) => i.level === "warning").length,
      info: this.issues.filter((i) => i.level === "info").length,
      issues: this.issues,
      summary,
      durationMs,
    };
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function validateAllData(prisma: PrismaClient): Promise<ValidationReport> {
  const validator = new DataValidator(prisma);
  return validator.validate();
}
