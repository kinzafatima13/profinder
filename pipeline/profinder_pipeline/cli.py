from __future__ import annotations

import argparse
import json
from pathlib import Path

from .extract import extract_candidates
from .fetch import PoliteFetcher
from .models import Candidate
from .normalize import normalize_values
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
    output.parent.mkdir(parents=True, exist_ok=True)
    count = 0

    with output.open("a", encoding="utf-8") as stream:
        for source in university.get("sources", []):
            required = ("url", "entity_type", "record_selector", "field_selectors")
            missing = [key for key in required if not source.get(key)]
            if missing:
                print(f"SKIP {source.get('url', '(no URL)')}: missing adapter settings {missing}")
                continue
            page = fetcher.fetch(source["url"])
            candidates = extract_candidates(
                args.university,
                page,
                source["entity_type"],
                source["record_selector"],
                source["field_selectors"],
            )
            for candidate in candidates:
                values, normalization_warnings = normalize_values(candidate.entity_type, candidate.values)
                candidate = Candidate(
                    candidate.entity_type,
                    candidate.university_key,
                    values,
                    {key: value for key, value in candidate.evidence.items() if key in values},
                    candidate.warnings + normalization_warnings,
                )
                candidate = validate_candidate(candidate)
                stream.write(json.dumps(candidate.to_dict(), ensure_ascii=False) + "\n")
                count += 1
    print(f"Review-only candidates written: {count}")
    print("No application database was opened or modified.")


if __name__ == "__main__":
    main()
