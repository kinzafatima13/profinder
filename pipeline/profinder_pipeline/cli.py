from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import unquote, urlparse

from .extract import extract_document_urls, extract_with_adapter
from .fetch import PoliteFetcher
from .models import Candidate
from .normalize import canonical_key, normalize_values
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
        required = ("url", "entity_type")
        missing = [key for key in required if not source.get(key)]
        adapter = source.get("adapter") or {
            "type": "css",
            "record_selector": source.get("record_selector"),
            "field_selectors": source.get("field_selectors"),
        }
        if not isinstance(adapter, dict):
            raise SystemExit(f"Invalid adapter configuration for {source.get('url')}. No snapshot was written.")
        adapter_type = str(adapter.get("type", "css")).lower()
        adapter_required = {"css": ("record_selector", "field_selectors"), "table": (), "article_list": (), "jsonld": (), "pdf": ("document_name",)}
        if adapter_type not in adapter_required:
            raise SystemExit(f"Unsupported adapter type '{adapter_type}' for {source.get('url')}'. No snapshot was written.")
        missing.extend(key for key in adapter_required[adapter_type] if not adapter.get(key))
        if missing:
            raise SystemExit(
                f"Invalid source configuration for {source.get('url', '(no URL)')}: "
                f"missing adapter settings {missing}. No snapshot was written."
            )

        page = fetcher.fetch_pdf(source["url"], max_bytes=int(adapter.get("max_bytes", 20000000))) if adapter_type == "pdf" else fetcher.fetch(source["url"])
        try:
            extracted = extract_with_adapter(args.university, page, source["entity_type"], adapter)
        except (TypeError, ValueError) as exc:
            raise SystemExit(
                f"Invalid adapter configuration for {source.get('url')}: {exc}. No snapshot was written."
            ) from exc
        for candidate in extracted:
            values, normalization_warnings = normalize_values(candidate.entity_type, candidate.values)
            normalized = Candidate(
                candidate.entity_type,
                candidate.university_key,
                values,
                {canonical_key(key): value for key, value in candidate.evidence.items() if canonical_key(key) in values},
                candidate.warnings + normalization_warnings,
            )
            candidates.append(validate_candidate(normalized))

        # PDF discovery is opt-in per reviewed source. Discovery is same-origin,
        # HTTPS-only and bounded; only these explicitly enabled candidates are fetched.
        pdf_config = source.get("discover_pdfs", False)
        if pdf_config:
            if pdf_config is True:
                pdf_config = {}
            if not isinstance(pdf_config, dict):
                raise SystemExit(f"discover_pdfs must be true or an object for {source['url']}.")
            max_documents = int(pdf_config.get("max_documents", 3))
            if max_documents < 1 or max_documents > 5:
                raise SystemExit("discover_pdfs.max_documents must be between 1 and 5.")
            pdf_urls = extract_document_urls(
                page,
                include_patterns=pdf_config.get("include_patterns"),
                exclude_patterns=pdf_config.get("exclude_patterns"),
                same_origin_only=True,
                max_results=max_documents,
            )
            for pdf_url in pdf_urls:
                filename = unquote(Path(urlparse(pdf_url).path).name)
                document_name = filename[:-4] if filename.lower().endswith(".pdf") else filename
                if not document_name:
                    document_name = "Discovered PDF document"
                pdf_page = fetcher.fetch_pdf(
                    pdf_url,
                    max_bytes=int(pdf_config.get("max_bytes", 20000000)),
                )
                pdf_adapter = {
                    "type": "pdf",
                    "document_name": document_name,
                    "max_pages": int(pdf_config.get("max_pages", 200)),
                    "max_chars": int(pdf_config.get("max_chars", 50000)),
                }
                pdf_candidates = extract_with_adapter(
                    args.university, pdf_page, source["entity_type"], pdf_adapter
                )
                for candidate in pdf_candidates:
                    values, normalization_warnings = normalize_values(candidate.entity_type, candidate.values)
                    normalized = Candidate(
                        candidate.entity_type,
                        candidate.university_key,
                        values,
                        {canonical_key(key): value for key, value in candidate.evidence.items() if canonical_key(key) in values},
                        candidate.warnings + normalization_warnings + ["discovered_pdf_requires_human_review"],
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
