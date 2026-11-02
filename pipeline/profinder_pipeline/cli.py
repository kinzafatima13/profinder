from __future__ import annotations

import argparse
from pathlib import Path

from .extract import extract_candidates
from .fetch import PoliteFetcher
from .models import Candidate
from .normalize import normalize_values
from .output import deduplicate_candidates, write_jsonl_atomic
from .registry import load_registry
from .validate import validate_candidate


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect university data into review-only candidate files.")
    parser.add_argument("--registry", default="pipeline/config/universities.yml")
    parser.add_argument("--university", required=True, help="Stable university key from the registry")
    parser.add_argument("--output", default="pipeline/output/candidates.jsonl")
    args = parser.parse_args()

    registry = load_registry(args.registry)
    if args.university not in registry:
        raise SystemExit(f"Unknown university key: {args.university}")
    university = registry[args.university]
    fetcher = PoliteFetcher()
    output = Path(args.output)
    candidates: list[Candidate] = []

    # Collect everything before replacing the previous snapshot. If fetching or
    # extraction fails, the last successful output remains untouched.
    for source in university.get("sources", []):
        required = ("url", "entity_type", "record_selector", "field_selectors")
        missing = [key for key in required if not source.get(key)]
        if missing:
            print(f"SKIP {source.get('url', '(no URL)')}: missing adapter settings {missing}")
            continue

        page = fetcher.fetch(source["url"])
        extracted = extract_candidates(
            args.university,
            page,
            source["entity_type"],
            source["record_selector"],
            source["field_selectors"],
        )
        for candidate in extracted:
            values, normalization_warnings = normalize_values(candidate.entity_type, candidate.values)
            normalized = Candidate(
                candidate.entity_type,
                candidate.university_key,
                values,
                {key: value for key, value in candidate.evidence.items() if key in values},
                candidate.warnings + normalization_warnings,
            )
            candidates.append(validate_candidate(normalized))

    if not candidates:
        raise SystemExit(
            "No candidates were collected. Previous output was left unchanged; check the source selectors."
        )

    unique_candidates, duplicate_count = deduplicate_candidates(candidates)
    write_jsonl_atomic(output, unique_candidates)

    print(f"Candidates collected: {len(candidates)}")
    print(f"Duplicate candidates removed: {duplicate_count}")
    print(f"Unique review-only candidates written: {len(unique_candidates)}")
    print(f"Output snapshot replaced: {output}")
    print("No application database was opened or modified.")


if __name__ == "__main__":
    main()
