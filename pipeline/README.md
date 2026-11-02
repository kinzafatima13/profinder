# ProFinderNow universal university data pipeline

## Purpose

One reusable pipeline serves every university. University differences live in
small, reviewed source-adapter configurations; fetching, evidence capture,
normalization, validation, review output, and (later) loading are shared.

**This implementation is collection-only.** It writes JSONL candidate files
under `pipeline/output/`. It does not connect to Prisma, SQLite, Neon, or the
production application database.

## Shared workflow

`official source registry -> polite fetch/cache -> adapter extraction -> canonical normalization -> validation -> review candidates`

Planned next stages are identity matching, isolated staging, release bundles,
human review, dry-run diffs, and a separately protected additive loader. Those
stages are not enabled by this first implementation.

## What is implemented

- A YAML university registry with stable university keys and official HTTPS sources.
- Reusable CSS source adapters: one record selector and field selectors per
  source page, rather than custom scraping code per university.
- A common canonical field vocabulary for universities, programs, professors,
  and scholarships.
- Field-level evidence: source URL, collection timestamp, extractor, and excerpt.
- Polite HTTP fetching: transparent User-Agent, robots.txt checks, per-host
  minimum 2.5-second interval, 30-day response cache, bounded response size.
- Validation warnings for missing required fields, missing evidence, and
  human-review fields such as tuition, fees, deadlines, coverage, and dates.
- Unit tests for registry validation, extraction/evidence, normalization, and
  human-review flags.

## Add a university

1. Verify its official admissions, program, scholarship, or faculty page.
2. Add a stable key and source URL to `pipeline/config/universities.yml`.
3. Configure a record selector for one repeated card/row and field selectors
   relative to that record.
4. Map extracted labels to canonical field names using
   `profinder_pipeline/normalize.py`. Unknown fields are flagged, not silently
   added to the shared schema.
5. Add a saved HTML fixture and extraction test for the new source adapter.
6. Run the pipeline and review candidate evidence before any future staging.

See `pipeline/config/universities.example.yml` for the adapter shape. The
example domain is illustrative and must not be treated as a real source.

## Setup and test

```bash
python -m venv pipeline/.venv
# Activate the environment, then:
python -m pip install -r pipeline/requirements.txt
PYTHONPATH=pipeline python -m unittest discover -s pipeline/tests -v
```

To collect from a configured university:

```bash
PYTHONPATH=pipeline python -m profinder_pipeline.cli --university <stable-key>
```

Output defaults to `pipeline/output/candidates.jsonl`. Cache files live in
`pipeline/.cache/`; both paths are ignored by Git.

## Safety boundaries

- Only explicit HTTPS source URLs are accepted.
- The fetcher checks robots.txt and fails closed if it cannot verify access,
  except when robots.txt returns HTTP 404.
- Do not add login-gated, personal, or non-public data sources.
- Do not bypass access controls, rate limits, or anti-bot protections.
- Missing data stays missing. Do not infer tuition, fees, deadlines, eligibility,
  scholarship coverage, current employment, or contact details.
- Aggregator records are not proof of current university affiliation.
- Every candidate is unverified until reviewed.
- This pipeline has no database loader and cannot modify live ProFinderNow data.

## Current limitations

- CSS selectors are source-specific and need review; there is no universal
  selector that can reliably parse every university site.
- PDF parsing, JavaScript-rendered pages, authenticated portals, identity
  resolution, duplicate matching, release signing, staging, and loading are not
  implemented yet.
- JSON-LD is not yet promoted into canonical fields.
- The registry currently contains no invented university entries. Add verified
  official sources and tested adapters in small batches.

## Development status

The pipeline is being developed on `feat/review-first-data-pipeline`. Keep it
separate from `main` until the unit tests, adapter fixtures, and review flow
are complete. Do not connect it to the production database as part of routine
collection.
