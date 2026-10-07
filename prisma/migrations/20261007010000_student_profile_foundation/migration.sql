-- Additive, nullable Student columns. Existing rows stay valid.
-- Do not run against production until the live datasource is confirmed.
ALTER TABLE "Student" ADD COLUMN "currentUniversity" TEXT;
ALTER TABLE "Student" ADD COLUMN "graduationYear" TEXT;
ALTER TABLE "Student" ADD COLUMN "academicLevel" TEXT;
ALTER TABLE "Student" ADD COLUMN "publications" TEXT;
ALTER TABLE "Student" ADD COLUMN "researchExperience" TEXT;
ALTER TABLE "Student" ADD COLUMN "researchMethods" TEXT;
ALTER TABLE "Student" ADD COLUMN "tools" TEXT;
ALTER TABLE "Student" ADD COLUMN "programmingLanguages" TEXT;
ALTER TABLE "Student" ADD COLUMN "researchKeywords" TEXT;
ALTER TABLE "Student" ADD COLUMN "preferredResearchAreas" TEXT;
ALTER TABLE "Student" ADD COLUMN "targetDegreeLevel" TEXT;
ALTER TABLE "Student" ADD COLUMN "intake" TEXT;
ALTER TABLE "Student" ADD COLUMN "fundingPreference" TEXT;
ALTER TABLE "Student" ADD COLUMN "fullyFundedPreference" TEXT;
ALTER TABLE "Student" ADD COLUMN "scholarshipPreference" TEXT;
ALTER TABLE "Student" ADD COLUMN "ielts" TEXT;
ALTER TABLE "Student" ADD COLUMN "toefl" TEXT;
ALTER TABLE "Student" ADD COLUMN "pte" TEXT;
ALTER TABLE "Student" ADD COLUMN "englishProof" TEXT;
ALTER TABLE "Student" ADD COLUMN "englishTestStatus" TEXT;
