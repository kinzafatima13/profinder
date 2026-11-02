# ProFinderNow Review-First Academic Data Pipeline

## Status

This branch is the safe foundation for the data-pipeline implementation. It is based on the current `main` branch. The pipeline described here is **not yet implemented**; do not run the existing bulk importer as a substitute.

## Audit findings (2026-11-02)

- `main` currently declares SQLite in `prisma/schema.prisma`.
- `src/lib/prisma.ts` forces Vercel runtime requests to use a bundled SQLite file copied to `/tmp/profinder.db`, ignoring a configured Neon/PostgreSQL `DATABASE_URL`.
- `scripts/import-pipeline.ts` calls `ProFinderImporter` directly against a Prisma client. The importer updates existing universities, programs, scholarships, and professors; some incoming null values can replace populated fields.
- The separate `feat/complete-data-pipeline` branch uses PostgreSQL but is 107 commits behind `main` and has only three commits ahead. Do not merge it wholesale.
- The uploaded data-pipeline guide calls for a review-first staging process, but its documented `pipeline/` package and `pipeline-run.yml` / `pipeline-load.yml` workflows were not found at those paths on `main` or `feat/complete-data-pipeline`.

## Non-negotiable safety rules

1. Collect only attributable data. Store a source URL and collection timestamp for each sourced fact.
2. Collection and validation must not write to application tables.
3. Stage candidate records separately and produce a reviewable release bundle before any application-table write.
4. Never delete existing academic records automatically.
5. Never overwrite populated fields automatically. Propose conflicting values for human review.
6. Do not treat OpenAlex or another aggregator as proof of current university employment. It can enrich a person already linked to a sourced university record only when the match is strong.
7. Dates, application fees, tuition, scholarship deadlines, and scholarship coverage require human review.
8. Never touch student, application, saved-professor, subscription, billing, usage, or Apply for Me records from the academic-data loader.
9. Keep production loads disabled unless the target is explicitly confirmed, the release is approved, checksums pass, and a dry-run diff has been reviewed.
10. Never print database credentials or full connection URLs in logs.

## Intended workflow

`official source registry -> polite fetch/cache -> extraction -> validation -> identity matching -> staging -> release bundle -> human review -> dry-run diff -> approved transactional load`

- **Discovery/fetch:** official university sources first; respect robots.txt, use a clear User-Agent, cache responses, and throttle requests per host.
- **Extraction:** preserve source URL and evidence for each extracted record. Missing evidence means the field remains empty.
- **Validation:** schema checks, source checks, required-field checks, duplicate detection, and special handling for high-risk fields.
- **Matching:** distinguish exact identifiers from fuzzy name matches; ambiguous matches become review items.
- **Staging:** separate tables/schema, isolated from application-facing data.
- **Review:** export CSV/JSON with before/after values, sources, confidence, and reasons for review.
- **Load:** additive-only changes, transactional execution, explicit target confirmation, and a rollback/restore plan.

## Implementation sequence

1. **Audit database routing and existing schema** without writing to any database.
2. **Build a read-only inventory** of academic tables, source coverage, duplicates, and missing required values.
3. **Implement source registry and fetch/cache layer** with host throttling and tests.
4. **Implement validation and matching** with fixture-based tests; no application-table writes.
5. **Add staging and release bundles** with stable checksums and human-review exports.
6. **Add a dry-run loader** that reports proposed inserts and field-level conflicts without changing data.
7. **Test against a disposable PostgreSQL database** seeded with synthetic fixtures.
8. **Only after review:** configure a protected manual workflow for approved loads. Do not run a production load as part of routine CI.

## First implementation gate

Before adding a loader, document and test the database target for every entry point. At present, the app's Vercel runtime routing and direct `new PrismaClient()` scripts may use different database targets. This must be resolved before any import script is run against a live environment.
