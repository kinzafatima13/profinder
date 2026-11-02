# ProFinderNow universal university data pipeline

## Purpose

One reusable pipeline serves every university. University differences live in small, reviewed source-adapter configurations; fetching, evidence capture, normalization, validation, and review output remain shared.

**This implementation is collection + human-review bundle only.** It writes local JSONL snapshots, review CSVs, and checksummed ZIP bundles. It does not connect to Prisma, SQLite, Neon, or the production application database.

## Shared workflow

`official source registry -> polite fetch/cache -> adapter extraction -> canonical normalization -> validation -> JSONL snapshot -> human review CSV -> checksummed approved release bundle`

The protected database loader is deliberately not implemented. A bundle is a reviewed artifact, not authorization to import it. Database staging and an additive, schema-aware loader require a separately reviewed implementation and explicit production approval.

## Implemented

- YAML registry with stable university keys and official HTTPS sources.
- Reusable CSS-card, HTML table, article/list, and Schema.org JSON-LD extraction adapters, selected through one shared adapter dispatcher.
- Filterable HTTPS same-origin link discovery for identifying candidate source pages; discovery does not automatically crawl or fetch links.
- Canonical fields for universities, programs, professors, and scholarships.
- Field-level evidence: source URL, collection timestamp, extractor, and excerpt.
- Polite fetch: transparent User-Agent, robots.txt checks, per-host throttling, 30-day cache, bounded retries, safe redirects.
- Validation warnings for missing required fields and high-risk facts requiring human review.
- Deterministic candidate fingerprints, exact deduplication, and atomic JSONL snapshots.
- Review CSV export with blank decision/reviewer fields.
- Review bundle creation only after every candidate has an explicit approved/rejected decision and a non-empty reviewer.
- Candidate fingerprint verification before review; unknown, duplicate, missing, or invalid decisions fail closed.
- Checksummed release ZIP containing approved records, review log, and manifest. Rejected records are excluded from the approved payload.
- Unit tests for collection, extraction, normalization, review validation, tamper detection, and release contents.

## Setup and test

```bash
python -m venv pipeline/.venv
# Activate the environment, then:
python -m pip install -r pipeline/requirements.txt
PYTHONPATH=pipeline python -m unittest discover -s pipeline/tests -v
```

## Collect candidates

```bash
PYTHONPATH=pipeline python -m profinder_pipeline.cli --university <stable-key>
```

Output defaults to `pipeline/output/candidates.jsonl`. The registry is intentionally empty until official source URLs and selectors have been verified and tested.

## Human review

Export a review CSV:

```bash
PYTHONPATH=pipeline python -m profinder_pipeline.review_cli export --input pipeline/output/candidates.jsonl --csv pipeline/output/review.csv
```

Open the CSV and fill `decision` with exactly `approved` or `rejected` for every row, and fill `reviewer`. Optional notes go in `review_notes`. Do not edit candidate IDs or source evidence.

Build the release bundle:

```bash
PYTHONPATH=pipeline python -m profinder_pipeline.review_cli bundle --input pipeline/output/candidates.jsonl --decisions pipeline/output/review.csv --output pipeline/output/release.zip
```

The command refuses incomplete or inconsistent review decisions. The ZIP contains `manifest.json`, `approved.jsonl`, and `review_log.json`. The manifest includes SHA-256 checksums and explicitly states that no database write occurred and no loader is included.

## Current live-source validation (2026-11-02)

- Shanghai Maritime University: official 2027 master's catalog fetched successfully (HTTP 200); 36 raw table candidates, 19 unique after exact deduplication. A representative sanitized DOM fixture is covered by regression tests.
- Yangtze University: official scholarship announcement fetched successfully (HTTP 200); title and embedded PDF URL discovered. Scholarship body and postgraduate catalog PDF are not parsed.
- Chengdu University of Technology: official English and international-college hosts returned HTTP 412 to direct fetches. No live fixture or live extraction is claimed.

These results validate selected extractor behaviors, not a complete three-university production adapter set. The executable registry remains empty. Do not invent selectors or infer missing program/scholarship fields.

## Safety boundaries and remaining work

- Collection and review commands never open an application database.
- No student, billing, application, subscription, or Apply for Me data is accessed or modified.
- Do not add login-gated or personal data sources, or bypass anti-bot controls.
- Missing data stays missing. Tuition, fees, deadlines, eligibility, scholarship coverage, and dates require human review.
- The release bundle is not a database import. Staging tables, schema mapping, conflict policy, additive-only loader, protected approval gate, rollback plan, and production import audit are future work.
- PDF parsing, JavaScript-rendered pages, sitemap crawling, identity resolution, and cross-source entity matching are not implemented.
- Do not enable a source until an official saved fixture and tested adapter exist.
