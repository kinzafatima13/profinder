from __future__ import annotations

import argparse
import json
from pathlib import Path

from .extract import extract_candidates
from .fetch import PoliteFetcher
from .registry import load_registry
from .validate import validate_candidate


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect university data into review-only candidate files.")
    parser.add_argument("--registry", default="config/universities.yml")
    parser.add_argument("--university", required=True, help="Stable university key from the registry")
    parser.add_argument("--output", default="pipeline/output/candidates.jsonl")
    parser.add_argument("--offline", action="store_true", help="Do not fetch; use cached source responses only")
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
            if not source.get("selectors"):
                print(f"SKIP {source['url']}: no reviewed selectors configured")
                continue
            if args.offline:
                print(f"OFFLINE mode: no network fetch performed for {source['url']}")
                continue
            page = fetcher.fetch(source["url"])
            candidates = extract_candidates(
                args.university, page, source.get("entity_type", "program"), source["selectors"]
            )
            for candidate in candidates:
                candidate = validate_candidate(candidate)
                stream.write(json.dumps(candidate.to_dict(), ensure_ascii=False) + "\n")
                count += 1
    print(f"Review-only candidates written: {count}")
    print("No application database was opened or modified.")


if __name__ == "__main__":
    main()
