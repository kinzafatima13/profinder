-- Additive only. Do not drop, reset, or overwrite existing academic rows.
-- Aligns dev.db with schema.prisma and adds enrichment fields approved 2026-10-08.
-- Existing dataStatus values are left unchanged. New verificationStatus defaults to UNVERIFIED.

ALTER TABLE "University" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "University" ADD COLUMN "lastCheckedAt" DATETIME;
ALTER TABLE "University" ADD COLUMN "confidence" REAL;

ALTER TABLE "Program" ADD COLUMN "academicFieldId" TEXT;
ALTER TABLE "Program" ADD COLUMN "disciplineId" TEXT;
ALTER TABLE "Program" ADD COLUMN "majorId" TEXT;
ALTER TABLE "Program" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "Program" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "Program" ADD COLUMN "officialName" TEXT;
ALTER TABLE "Program" ADD COLUMN "studyMode" TEXT;
ALTER TABLE "Program" ADD COLUMN "degreeLevel" TEXT;
ALTER TABLE "Program" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "Program" ADD COLUMN "lastCheckedAt" DATETIME;
ALTER TABLE "Program" ADD COLUMN "lastVerifiedAt" DATETIME;
ALTER TABLE "Program" ADD COLUMN "confidence" REAL;
ALTER TABLE "Program" ADD COLUMN "sourceUrl" TEXT;

ALTER TABLE "Professor" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "Professor" ADD COLUMN "lastCheckedAt" DATETIME;
ALTER TABLE "Professor" ADD COLUMN "lastVerifiedAt" DATETIME;
ALTER TABLE "Professor" ADD COLUMN "confidence" REAL;
ALTER TABLE "Professor" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "Professor" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "Professor" ADD COLUMN "googleScholarId" TEXT;
ALTER TABLE "Professor" ADD COLUMN "supervisesMasters" BOOLEAN;
ALTER TABLE "Professor" ADD COLUMN "supervisesPhd" BOOLEAN;
ALTER TABLE "Professor" ADD COLUMN "acceptingStudents" BOOLEAN;

ALTER TABLE "Scholarship" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "Scholarship" ADD COLUMN "lastCheckedAt" DATETIME;
ALTER TABLE "Scholarship" ADD COLUMN "lastVerifiedAt" DATETIME;
ALTER TABLE "Scholarship" ADD COLUMN "confidence" REAL;
ALTER TABLE "Scholarship" ADD COLUMN "funder" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "degreeLevel" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "tuitionCoverage" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "accommodationCoverage" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "monthlyStipend" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "insurance" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "travelAllowance" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "applicationFeeCovered" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "otherBenefits" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "eligibility" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "gpaRequirement" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "ageMin" INTEGER;
ALTER TABLE "Scholarship" ADD COLUMN "ageMax" INTEGER;
ALTER TABLE "Scholarship" ADD COLUMN "nationalityRestrictions" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "languageRequirements" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "supervisorRequired" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "requiredDocuments" TEXT;

ALTER TABLE "Publication" ADD COLUMN "authorMatchStatus" TEXT;
ALTER TABLE "Publication" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

CREATE TABLE IF NOT EXISTS "AcademicField" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sourceUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicField_slug_key" ON "AcademicField"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicField_name_key" ON "AcademicField"("name");
CREATE INDEX IF NOT EXISTS "AcademicField_verificationStatus_idx" ON "AcademicField"("verificationStatus");

CREATE TABLE IF NOT EXISTS "Discipline" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "academicFieldId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sourceUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Discipline_academicFieldId_fkey" FOREIGN KEY ("academicFieldId") REFERENCES "AcademicField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Discipline_slug_key" ON "Discipline"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Discipline_academicFieldId_name_key" ON "Discipline"("academicFieldId", "name");
CREATE INDEX IF NOT EXISTS "Discipline_academicFieldId_idx" ON "Discipline"("academicFieldId");

CREATE TABLE IF NOT EXISTS "Major" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "disciplineId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "officialName" TEXT,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sourceUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Major_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Major_slug_key" ON "Major"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Major_disciplineId_name_key" ON "Major"("disciplineId", "name");
CREATE INDEX IF NOT EXISTS "Major_disciplineId_idx" ON "Major"("disciplineId");

CREATE TABLE IF NOT EXISTS "College" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "universityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "officialName" TEXT,
  "sourceUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "College_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "College_universityId_name_key" ON "College"("universityId", "name");
CREATE INDEX IF NOT EXISTS "College_universityId_idx" ON "College"("universityId");

CREATE TABLE IF NOT EXISTS "Department" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "universityId" TEXT NOT NULL,
  "collegeId" TEXT,
  "name" TEXT NOT NULL,
  "officialName" TEXT,
  "sourceUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Department_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Department_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Department_universityId_name_key" ON "Department"("universityId", "name");
CREATE INDEX IF NOT EXISTS "Department_universityId_idx" ON "Department"("universityId");

CREATE TABLE IF NOT EXISTS "ProgramResearchArea" (
  "programId" TEXT NOT NULL,
  "researchAreaId" TEXT NOT NULL,
  PRIMARY KEY ("programId", "researchAreaId"),
  CONSTRAINT "ProgramResearchArea_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProgramResearchArea_researchAreaId_fkey" FOREIGN KEY ("researchAreaId") REFERENCES "ResearchArea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ProgramProfessor" (
  "programId" TEXT NOT NULL,
  "professorId" TEXT NOT NULL,
  "relationship" TEXT,
  PRIMARY KEY ("programId", "professorId"),
  CONSTRAINT "ProgramProfessor_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProgramProfessor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProgramProfessor_professorId_idx" ON "ProgramProfessor"("professorId");

CREATE TABLE IF NOT EXISTS "ProfessorAcademicField" (
  "professorId" TEXT NOT NULL,
  "academicFieldId" TEXT NOT NULL,
  PRIMARY KEY ("professorId", "academicFieldId"),
  CONSTRAINT "ProfessorAcademicField_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProfessorAcademicField_academicFieldId_fkey" FOREIGN KEY ("academicFieldId") REFERENCES "AcademicField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ProfessorDiscipline" (
  "professorId" TEXT NOT NULL,
  "disciplineId" TEXT NOT NULL,
  PRIMARY KEY ("professorId", "disciplineId"),
  CONSTRAINT "ProfessorDiscipline_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProfessorDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ProfessorMajor" (
  "professorId" TEXT NOT NULL,
  "majorId" TEXT NOT NULL,
  PRIMARY KEY ("professorId", "majorId"),
  CONSTRAINT "ProfessorMajor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProfessorMajor_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AcademicAlias" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "term" TEXT NOT NULL,
  "normalizedTerm" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "academicFieldId" TEXT,
  "disciplineId" TEXT,
  "majorId" TEXT,
  CONSTRAINT "AcademicAlias_academicFieldId_fkey" FOREIGN KEY ("academicFieldId") REFERENCES "AcademicField" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademicAlias_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademicAlias_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicAlias_normalizedTerm_kind_key" ON "AcademicAlias"("normalizedTerm", "kind");
CREATE INDEX IF NOT EXISTS "AcademicAlias_normalizedTerm_idx" ON "AcademicAlias"("normalizedTerm");

CREATE TABLE IF NOT EXISTS "SourceRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "checkedAt" DATETIME,
  "verifiedAt" DATETIME,
  "confidence" REAL,
  "httpStatus" INTEGER,
  "contentHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "SourceRecord_entityType_entityId_idx" ON "SourceRecord"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "SourceRecord_url_idx" ON "SourceRecord"("url");

CREATE TABLE IF NOT EXISTS "ChangeLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "beforeJson" TEXT,
  "afterJson" TEXT,
  "sourceUrl" TEXT,
  "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" DATETIME,
  "reviewedBy" TEXT
);
CREATE INDEX IF NOT EXISTS "ChangeLog_entityType_entityId_idx" ON "ChangeLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "ChangeLog_detectedAt_idx" ON "ChangeLog"("detectedAt");

CREATE TABLE IF NOT EXISTS "MatchFeedback" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT,
  "query" TEXT,
  "professorId" TEXT,
  "programId" TEXT,
  "universityId" TEXT,
  "vote" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MatchFeedback_studentId_idx" ON "MatchFeedback"("studentId");
CREATE INDEX IF NOT EXISTS "MatchFeedback_professorId_idx" ON "MatchFeedback"("professorId");

CREATE TABLE IF NOT EXISTS "ApplyRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "feeCents" INTEGER NOT NULL DEFAULT 3000,
  "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
  "paymentRef" TEXT,
  "studentNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ApplyRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ApplyRequest_studentId_idx" ON "ApplyRequest"("studentId");

CREATE TABLE IF NOT EXISTS "ApplyRequestItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'selected',
  "preparationNote" TEXT,
  "studentApprovedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ApplyRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApplyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplyRequestItem_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApplyRequestItem_requestId_universityId_key" ON "ApplyRequestItem"("requestId", "universityId");
CREATE INDEX IF NOT EXISTS "ApplyRequestItem_requestId_idx" ON "ApplyRequestItem"("requestId");

CREATE TABLE IF NOT EXISTS "ApplyDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplyDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApplyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ApplyDocument_requestId_idx" ON "ApplyDocument"("requestId");

CREATE TABLE IF NOT EXISTS "PublicationTopic" (
  "publicationId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  PRIMARY KEY ("publicationId", "topicId"),
  CONSTRAINT "PublicationTopic_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PublicationTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PublicationTopic_topicId_idx" ON "PublicationTopic"("topicId");

CREATE TABLE IF NOT EXISTS "Deadline" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "dateText" TEXT,
  "dateStart" DATETIME,
  "dateEnd" DATETIME,
  "sourceUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "Deadline_entityType_entityId_kind_idx" ON "Deadline"("entityType", "entityId", "kind");
CREATE INDEX IF NOT EXISTS "Deadline_verificationStatus_idx" ON "Deadline"("verificationStatus");

CREATE INDEX IF NOT EXISTS "Professor_googleScholarId_idx" ON "Professor"("googleScholarId");
CREATE INDEX IF NOT EXISTS "Publication_authorMatchStatus_idx" ON "Publication"("authorMatchStatus");
