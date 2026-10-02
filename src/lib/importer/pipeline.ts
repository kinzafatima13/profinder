import { PrismaClient } from "@prisma/client";
import { findInstitution, authorsAtInstitution, recentWorks, searchAuthorAtInstitution } from "../openalex";
import { authorByOrcid, authorPapers } from "../semanticScholar";
import { splitName } from "../normalize";
import { matchResearchAreas } from "../taxonomy";
import {
  UniversityInput,
  ProfessorInput,
  ImportMetrics,
  normalizeVerificationStatus,
} from "./types";
import {
  findUniversityDuplicate,
  findProfessorDuplicate,
  findPublicationDuplicate,
} from "./deduplicate";

export type ImportOptions = {
  enrichWithAcademicApis?: boolean;
  maxProfessorsPerUni?: number;
  maxWorksPerProf?: number;
  defaultCountry?: string;
  onProgress?: (msg: string) => void;
};

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class ProFinderImporter {
  private prisma: PrismaClient;
  private metrics: ImportMetrics;
  private options: Required<ImportOptions>;

  constructor(prisma: PrismaClient, options: ImportOptions = {}) {
    this.prisma = prisma;
    this.options = {
      enrichWithAcademicApis: options.enrichWithAcademicApis ?? true,
      maxProfessorsPerUni: options.maxProfessorsPerUni ?? 20,
      maxWorksPerProf: options.maxWorksPerProf ?? 5,
      defaultCountry: options.defaultCountry ?? "China",
      onProgress: options.onProgress ?? (() => {}),
    };
    this.metrics = {
      startTime: Date.now(),
      universitiesDiscovered: 0,
      universitiesCreated: 0,
      universitiesUpdated: 0,
      universitiesFailed: 0,
      professorsDiscovered: 0,
      professorsCreated: 0,
      professorsUpdated: 0,
      professorsEnriched: 0,
      professorsFailed: 0,
      publicationsImported: 0,
      duplicatesSkipped: 0,
      recordsNeedingVerification: 0,
      recordsVerified: 0,
      failedUrls: [],
      apiErrors: [],
    };
  }

  getMetrics(): ImportMetrics {
    return { ...this.metrics, endTime: Date.now() };
  }

  private log(msg: string) {
    this.options.onProgress(msg);
  }

  /**
   * Process a single university and all its programs, scholarships, and professors.
   * Completely isolated with try/catch to guarantee zero failure cascade.
   */
  async processUniversity(
    uniInput: UniversityInput,
    baseProfessorsForUni: ProfessorInput[] = []
  ): Promise<boolean> {
    this.metrics.universitiesDiscovered++;
    const uniName = uniInput.name.trim();
    this.log(`\n======================================================`);
    this.log(`🏛️  Processing University: ${uniName}`);
    this.log(`======================================================`);

    try {
      // 1. Identify or discover OpenAlex institution ID if missing
      let openAlexId = uniInput.openAlexId;
      if (!openAlexId && this.options.enrichWithAcademicApis) {
        try {
          const inst = await findInstitution(uniName);
          if (inst) {
            openAlexId = inst.id;
            this.log(`   Found OpenAlex Institution: ${inst.name} (${inst.id})`);
          }
        } catch (err: unknown) {
          this.metrics.apiErrors.push({
            endpoint: `findInstitution(${uniName})`,
            error: getErrorMessage(err),
          });
        }
      }

      // 2. Check for duplicate university
      const existingUni = await findUniversityDuplicate(this.prisma, {
        name: uniName,
        openAlexId,
      });

      const verificationStatus = normalizeVerificationStatus(uniInput.dataStatus);
      if (verificationStatus === "VERIFIED") this.metrics.recordsVerified++;
      else this.metrics.recordsNeedingVerification++;

      const uniPayload = {
        nameZh: uniInput.nameZh ?? existingUni?.nameZh ?? null,
        country: uniInput.country ?? existingUni?.country ?? this.options.defaultCountry,
        province: uniInput.province ?? existingUni?.province ?? null,
        city: uniInput.city ?? existingUni?.city ?? null,
        officialUrl: uniInput.officialUrl ?? existingUni?.officialUrl ?? null,
        sourceUrl: uniInput.sourceUrl ?? existingUni?.sourceUrl ?? uniInput.officialUrl ?? null,
        description: uniInput.description ?? existingUni?.description ?? null,
        agencyNumber: uniInput.agencyNumber ?? existingUni?.agencyNumber ?? null,
        openAlexId: openAlexId ?? existingUni?.openAlexId ?? null,
        logoUrl: uniInput.logoUrl ?? existingUni?.logoUrl ?? null,
        dataStatus: verificationStatus.toLowerCase(),
        dataSource: uniInput.dataSource ?? existingUni?.dataSource ?? "curated",
        applicationUrl: uniInput.applicationUrl ?? existingUni?.applicationUrl ?? null,
        applicationFee: uniInput.applicationFee ?? existingUni?.applicationFee ?? null,
        applicationDeadline: uniInput.applicationDeadline ?? existingUni?.applicationDeadline ?? null,
        scholarshipUrl: uniInput.scholarshipUrl ?? existingUni?.scholarshipUrl ?? null,
        scholarshipDeadline: uniInput.scholarshipDeadline ?? existingUni?.scholarshipDeadline ?? null,
        verifiedAt: verificationStatus === "VERIFIED" ? new Date() : existingUni?.verifiedAt ?? null,
      };

      let universityId: string;
      if (existingUni) {
        const updated = await this.prisma.university.update({
          where: { id: existingUni.id },
          data: uniPayload,
        });
        universityId = updated.id;
        this.metrics.universitiesUpdated++;
        this.log(`   ✓ Updated existing university record: ${uniName} (ID: ${universityId})`);
      } else {
        const created = await this.prisma.university.create({
          data: { name: uniName, ...uniPayload },
        });
        universityId = created.id;
        this.metrics.universitiesCreated++;
        this.log(`   + Created new university record: ${uniName} (ID: ${universityId})`);
      }

      // 3. Process Programs
      if (uniInput.programs && uniInput.programs.length > 0) {
        for (const prog of uniInput.programs) {
          const existingProg = await this.prisma.program.findFirst({
            where: { universityId, degree: prog.degree, major: prog.major },
          });
          const progData = {
            teachingLang: prog.teachingLang ?? null,
            requirements: prog.requirements ?? null,
            programUrl: prog.programUrl ?? null,
            deadline: prog.deadline ?? null,
            openingDate: prog.openingDate ?? null,
            scholarshipDeadline: prog.scholarshipDeadline ?? null,
            tuition: prog.tuition ?? null,
            applicationFee: prog.applicationFee ?? null,
            duration: prog.duration ?? null,
            englishReq: prog.englishReq ?? null,
            ielts: prog.ielts ?? null,
            toefl: prog.toefl ?? null,
            gpaRequirement: prog.gpaRequirement ?? null,
            cscType: prog.cscType ?? null,
            supervisorRequired: prog.supervisorRequired ?? null,
            applicationUrl: prog.applicationUrl ?? null,
          };
          if (existingProg) {
            await this.prisma.program.update({
              where: { id: existingProg.id },
              data: progData,
            });
          } else {
            await this.prisma.program.create({
              data: { universityId, degree: prog.degree, major: prog.major, ...progData },
            });
          }
        }
        this.log(`   ✓ Synced ${uniInput.programs.length} programs`);
      }

      // 4. Process Scholarships
      if (uniInput.scholarships && uniInput.scholarships.length > 0) {
        for (const sch of uniInput.scholarships) {
          const existingSch = await this.prisma.scholarship.findFirst({
            where: { universityId, name: sch.name },
          });
          const schData = {
            type: sch.type ?? null,
            requirements: sch.requirements ?? null,
            deadline: sch.deadline ?? null,
            officialUrl: sch.officialUrl ?? null,
            advantages: sch.advantages ?? null,
            coverage: sch.coverage ?? null,
            dataStatus: sch.dataStatus ?? "unverified",
          };
          if (existingSch) {
            await this.prisma.scholarship.update({
              where: { id: existingSch.id },
              data: schData,
            });
          } else {
            await this.prisma.scholarship.create({
              data: { universityId, name: sch.name, ...schData },
            });
          }
        }
        this.log(`   ✓ Synced ${uniInput.scholarships.length} scholarships`);
      }

      // 5. Gather and Process Professors
      // Prioritize verified official base records, then enrich with OpenAlex / Semantic Scholar
      const combinedProfs: ProfessorInput[] = [...(uniInput.professors || []), ...baseProfessorsForUni];
      const seenProfNames = new Set<string>();
      const uniqueProfs: ProfessorInput[] = [];

      for (const p of combinedProfs) {
        const key = p.name.trim().toLowerCase();
        if (!seenProfNames.has(key)) {
          seenProfNames.add(key);
          uniqueProfs.push(p);
        }
      }

      // If we have few or no professors and have an OpenAlex institution ID, discover additional authors
      if (uniqueProfs.length < this.options.maxProfessorsPerUni && openAlexId && this.options.enrichWithAcademicApis) {
        try {
          this.log(`   Searching OpenAlex for top faculty at ${openAlexId}...`);
          const academicAuthors = await authorsAtInstitution(
            openAlexId,
            this.options.maxProfessorsPerUni - uniqueProfs.length
          );
          for (const a of academicAuthors) {
            const key = a.name.trim().toLowerCase();
            if (!seenProfNames.has(key)) {
              seenProfNames.add(key);
              uniqueProfs.push({
                name: a.name,
                openAlexId: a.openAlexId,
                orcid: a.orcid,
                researchInterests: a.topics.map((t) => t.name).join(", "),
                dataSource: "openalex",
                sourceUrl: a.sourceUrl,
                dataStatus: "unverified",
              });
            }
          }
        } catch (err: unknown) {
          this.metrics.apiErrors.push({
            endpoint: `authorsAtInstitution(${openAlexId})`,
            error: getErrorMessage(err),
          });
        }
      }

      this.log(`   Processing ${uniqueProfs.length} professors for ${uniName}...`);
      let profCount = 0;

      for (const profInput of uniqueProfs) {
        if (profCount >= this.options.maxProfessorsPerUni) break;
        profCount++;
        await this.processProfessor(universityId, uniName, openAlexId, profInput);
      }

      return true;
    } catch (err: unknown) {
      this.metrics.universitiesFailed++;
      this.log(`   ❌ ERROR processing university ${uniName}: ${getErrorMessage(err)}`);
      return false;
    }
  }

  /**
   * Process a single professor record: deduplication, upsert, enrichment,
   * research area classification, and publication importing.
   */
  async processProfessor(
    universityId: string,
    universityName: string,
    universityOpenAlexId: string | null | undefined,
    input: ProfessorInput
  ): Promise<boolean> {
    this.metrics.professorsDiscovered++;
    const profName = input.name.trim();

    try {
      // 1. Deduplication check
      const existing = await findProfessorDuplicate(this.prisma, universityId, {
        name: profName,
        orcid: input.orcid,
        openAlexId: input.openAlexId,
        semanticScholarId: input.semanticScholarId,
        email: input.email,
      });

      const nameSplit = splitName(profName);
      const verificationStatus = normalizeVerificationStatus(input.dataStatus);
      if (verificationStatus === "VERIFIED") this.metrics.recordsVerified++;
      else this.metrics.recordsNeedingVerification++;

      let openAlexId = input.openAlexId || existing?.openAlexId;
      let orcid = input.orcid || existing?.orcid;
      let semanticScholarId = input.semanticScholarId || existing?.semanticScholarId;
      let topicsFromApi: { id: string | null; name: string }[] = [];

      // 2. Academic API Enrichment (if enabled and missing IDs)
      if (this.options.enrichWithAcademicApis) {
        // A. Search OpenAlex if openAlexId is missing
        if (!openAlexId && universityOpenAlexId) {
          try {
            const authorHit = await searchAuthorAtInstitution(profName, universityOpenAlexId);
            if (authorHit) {
              openAlexId = authorHit.openAlexId;
              if (!orcid && authorHit.orcid) orcid = authorHit.orcid;
              topicsFromApi = authorHit.topics;
              this.metrics.professorsEnriched++;
            }
          } catch (err: unknown) {
            this.metrics.apiErrors.push({
              endpoint: `searchAuthorAtInstitution(${profName})`,
              error: getErrorMessage(err),
            });
          }
        }

        // B. Search Semantic Scholar by ORCID if semanticScholarId is missing
        if (orcid && !semanticScholarId) {
          try {
            const s2Author = await authorByOrcid(orcid);
            if (s2Author?.authorId) {
              semanticScholarId = s2Author.authorId;
            }
          } catch (err: unknown) {
            this.metrics.apiErrors.push({
              endpoint: `authorByOrcid(${orcid})`,
              error: getErrorMessage(err),
            });
          }
        }
      }

      // Preserve official university profile URL as primary, falling back to academic source URL
      const profileUrl = input.profileUrl ?? existing?.profileUrl ?? (openAlexId ? `https://openalex.org/${openAlexId}` : null);
      const researchInterests = [
        input.researchInterests,
        existing?.researchInterests,
        topicsFromApi.map((t) => t.name).join(", "),
      ]
        .filter(Boolean)
        .join("; ");

      const profPayload = {
        firstName: nameSplit.firstName ?? existing?.firstName ?? null,
        lastName: nameSplit.lastName ?? existing?.lastName ?? null,
        nameZh: input.nameZh ?? existing?.nameZh ?? null,
        position: input.position ?? existing?.position ?? null,
        school: input.school ?? existing?.school ?? null,
        department: input.department ?? existing?.department ?? null,
        country: input.country ?? existing?.country ?? null,
        email: input.email ?? existing?.email ?? null,
        profileUrl,
        personalWebsite: input.personalWebsite ?? existing?.personalWebsite ?? null,
        researchInterests: researchInterests || null,
        researchKeywords: input.researchKeywords ?? existing?.researchKeywords ?? null,
        lab: input.lab ?? existing?.lab ?? null,
        orcid: orcid ?? null,
        openAlexId: openAlexId ?? null,
        semanticScholarId: semanticScholarId ?? null,
        dataStatus: verificationStatus.toLowerCase(),
        dataSource: input.dataSource ?? existing?.dataSource ?? "official_import",
        lastSyncedAt: new Date(),
        verifiedAt: verificationStatus === "VERIFIED" ? new Date() : existing?.verifiedAt ?? null,
      };

      let professorId: string;
      if (existing) {
        const updated = await this.prisma.professor.update({
          where: { id: existing.id },
          data: profPayload,
        });
        professorId = updated.id;
        this.metrics.professorsUpdated++;
      } else {
        const created = await this.prisma.professor.create({
          data: {
            name: profName,
            universityId,
            ...profPayload,
          },
        });
        professorId = created.id;
        this.metrics.professorsCreated++;
      }

      // 3. Save Professor Sources
      if (input.sourceUrl || profileUrl) {
        const srcUrl = input.sourceUrl || profileUrl!;
        const srcName = input.dataSource || (profileUrl?.includes(".edu") ? "official_university" : "web");
        const existingSrc = await this.prisma.professorSource.findFirst({
          where: { professorId, sourceUrl: srcUrl },
        });
        if (!existingSrc) {
          await this.prisma.professorSource.create({
            data: {
              professorId,
              source: srcName,
              externalId: openAlexId || orcid || null,
              sourceUrl: srcUrl,
            },
          });
        }
      }

      // 4. Save Topics & Link ProfessorTopic
      if (topicsFromApi.length > 0) {
        for (const t of topicsFromApi) {
          const topicRow = await this.prisma.topic.upsert({
            where: { name: t.name },
            update: { openAlexTopicId: t.id },
            create: { name: t.name, openAlexTopicId: t.id },
          });

          await this.prisma.professorTopic.upsert({
            where: { professorId_topicId: { professorId, topicId: topicRow.id } },
            update: {},
            create: { professorId, topicId: topicRow.id },
          });
        }
      }

      // 5. Categorize into Research Areas (Multi-label taxonomy)
      const evidence = [
        profPayload.researchInterests,
        profPayload.researchKeywords,
        profPayload.department,
        profPayload.school,
        profPayload.lab,
        topicsFromApi.map((t) => t.name).join(" "),
      ]
        .filter(Boolean)
        .join(" ");

      const matchedAreaNames = matchResearchAreas(evidence);
      if (matchedAreaNames.length > 0) {
        for (const areaName of matchedAreaNames) {
          const areaRecord = await this.prisma.researchArea.findUnique({
            where: { name: areaName },
          });
          if (areaRecord) {
            await this.prisma.professorResearchArea.upsert({
              where: {
                professorId_researchAreaId: {
                  professorId,
                  researchAreaId: areaRecord.id,
                },
              },
              update: {},
              create: {
                professorId,
                researchAreaId: areaRecord.id,
              },
            });
          }
        }
      }

      // 6. Import & Deduplicate Publications
      if (this.options.enrichWithAcademicApis && (openAlexId || semanticScholarId)) {
        await this.importPublications(professorId, openAlexId, semanticScholarId);
      }

      return true;
    } catch (err: unknown) {
      this.metrics.professorsFailed++;
      this.log(`      ⚠️  Failed to process professor "${profName}": ${getErrorMessage(err)}`);
      return false;
    }
  }

  /**
   * Fetch, deduplicate, and store publications from OpenAlex and Semantic Scholar.
   */
  private async importPublications(
    professorId: string,
    openAlexId?: string | null,
    semanticScholarId?: string | null
  ) {
    const publicationsToInsert: {
      title: string;
      year?: number | null;
      authors?: string | null;
      venue?: string | null;
      citationCount?: number | null;
      abstract?: string | null;
      doi?: string | null;
      openAlexWorkId?: string | null;
      semanticScholarPaperId?: string | null;
      sourceUrl?: string | null;
    }[] = [];

    // 1. Fetch from OpenAlex
    if (openAlexId) {
      try {
        const works = await recentWorks(openAlexId, this.options.maxWorksPerProf);
        for (const w of works) {
          publicationsToInsert.push({
            title: w.title,
            year: w.year,
            authors: w.authors,
            venue: w.venue,
            citationCount: w.citationCount,
            abstract: w.abstract,
            doi: w.doi,
            openAlexWorkId: w.openAlexWorkId,
            sourceUrl: w.sourceUrl,
          });
        }
      } catch (err: unknown) {
        this.metrics.apiErrors.push({
          endpoint: `recentWorks(${openAlexId})`,
          error: getErrorMessage(err),
        });
      }
    }

    // 2. Fetch from Semantic Scholar
    if (semanticScholarId) {
      try {
        const papers = await authorPapers(semanticScholarId, this.options.maxWorksPerProf);
        for (const p of papers) {
          publicationsToInsert.push({
            title: p.title,
            year: p.year,
            authors: p.authors,
            venue: p.venue,
            citationCount: p.citationCount,
            abstract: p.abstract,
            doi: p.doi,
            semanticScholarPaperId: p.semanticScholarPaperId,
            sourceUrl: p.sourceUrl,
          });
        }
      } catch (err: unknown) {
        this.metrics.apiErrors.push({
          endpoint: `authorPapers(${semanticScholarId})`,
          error: getErrorMessage(err),
        });
      }
    }

    // 3. Deduplicate and upsert each publication
    const publicationTitles: string[] = [];
    for (const pub of publicationsToInsert) {
      if (!pub.title || pub.title.trim().length < 3) continue;

      const duplicate = await findPublicationDuplicate(this.prisma, professorId, {
        doi: pub.doi,
        openAlexWorkId: pub.openAlexWorkId,
        semanticScholarPaperId: pub.semanticScholarPaperId,
        title: pub.title,
      });

      if (duplicate) {
        this.metrics.duplicatesSkipped++;
        // Merge missing fields
        await this.prisma.publication.update({
          where: { id: duplicate.id },
          data: {
            authors: duplicate.authors || pub.authors,
            venue: duplicate.venue || pub.venue,
            citationCount: duplicate.citationCount ?? pub.citationCount,
            abstract: duplicate.abstract || pub.abstract,
            doi: duplicate.doi || pub.doi,
            openAlexWorkId: duplicate.openAlexWorkId || pub.openAlexWorkId,
            semanticScholarPaperId: duplicate.semanticScholarPaperId || pub.semanticScholarPaperId,
          },
        });
        publicationTitles.push(`${duplicate.year || "n.d."} ${duplicate.title}`);
      } else {
        await this.prisma.publication.create({
          data: {
            professorId,
            title: pub.title,
            year: pub.year ?? null,
            authors: pub.authors ?? null,
            venue: pub.venue ?? null,
            citationCount: pub.citationCount ?? null,
            abstract: pub.abstract ?? null,
            doi: pub.doi ?? null,
            openAlexWorkId: pub.openAlexWorkId ?? null,
            semanticScholarPaperId: pub.semanticScholarPaperId ?? null,
            sourceUrl: pub.sourceUrl ?? null,
          },
        });
        this.metrics.publicationsImported++;
        publicationTitles.push(`${pub.year || "n.d."} ${pub.title}`);
      }
    }

    // Update professor's text publication summary for compatibility with matching algorithm
    if (publicationTitles.length > 0) {
      await this.prisma.professor.update({
        where: { id: professorId },
        data: {
          publications: publicationTitles.slice(0, 10).join("\n"),
        },
      });
    }
  }

  /**
   * Print a detailed, professional ASCII summary report.
   */
  printReport(): void {
    const elapsedSec = ((Date.now() - this.metrics.startTime) / 1000).toFixed(1);
    console.log(`\n======================================================`);
    console.log(`            PROFINDER DATA IMPORT REPORT              `);
    console.log(`======================================================`);
    console.log(`Duration:                     ${elapsedSec}s`);
    console.log(`------------------------------------------------------`);
    console.log(`Universities Discovered:      ${this.metrics.universitiesDiscovered}`);
    console.log(`Universities Created:         ${this.metrics.universitiesCreated}`);
    console.log(`Universities Updated:         ${this.metrics.universitiesUpdated}`);
    console.log(`Universities Failed:          ${this.metrics.universitiesFailed}`);
    console.log(`------------------------------------------------------`);
    console.log(`Professors Discovered:        ${this.metrics.professorsDiscovered}`);
    console.log(`Professors Created:           ${this.metrics.professorsCreated}`);
    console.log(`Professors Updated:           ${this.metrics.professorsUpdated}`);
    console.log(`Professors Enriched (APIs):   ${this.metrics.professorsEnriched}`);
    console.log(`Professors Failed:            ${this.metrics.professorsFailed}`);
    console.log(`------------------------------------------------------`);
    console.log(`Publications Imported:        ${this.metrics.publicationsImported}`);
    console.log(`Duplicates Skipped:           ${this.metrics.duplicatesSkipped}`);
    console.log(`------------------------------------------------------`);
    console.log(`Records Verified:             ${this.metrics.recordsVerified}`);
    console.log(`Records Needing Verification: ${this.metrics.recordsNeedingVerification}`);
    console.log(`------------------------------------------------------`);
    console.log(`API Warnings/Errors:          ${this.metrics.apiErrors.length}`);
    if (this.metrics.apiErrors.length > 0) {
      console.log(`Recent API errors:`);
      for (const err of this.metrics.apiErrors.slice(0, 5)) {
        console.log(` - [${err.endpoint}]: ${err.error}`);
      }
    }
    console.log(`======================================================\n`);
  }
}
