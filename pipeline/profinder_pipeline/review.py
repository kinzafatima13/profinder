from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import Candidate, Evidence
from .output import candidate_fingerprint


REVIEW_COLUMNS = (
    "candidate_id", "decision", "reviewer", "review_notes",
    "entity_type", "university_key", "values_json", "evidence_json", "warnings_json",
)


class ReviewError(ValueError):
    pass


def _load_snapshot(path: str | Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for line_number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ReviewError(f"Invalid JSON on line {line_number}: {exc}") from exc
        required = {"candidate_id", "entity_type", "university_key", "values", "evidence", "warnings"}
        if not isinstance(record, dict) or not required.issubset(record):
            raise ReviewError(f"Line {line_number} is missing candidate fields.")
        evidence = {
            key: Evidence(**value) for key, value in record["evidence"].items()
        }
        candidate = Candidate(
            entity_type=record["entity_type"],
            university_key=record["university_key"],
            values=record["values"],
            evidence=evidence,
            warnings=record["warnings"],
        )
        expected = candidate_fingerprint(candidate)
        if record["candidate_id"] != expected:
            raise ReviewError(f"Candidate fingerprint mismatch on line {line_number}.")
        if expected in seen:
            raise ReviewError(f"Duplicate candidate ID in snapshot: {expected}")
        seen.add(expected)
        records.append(record)
    if not records:
        raise ReviewError("Snapshot is empty; no review artifact was created.")
    return records


def export_review_csv(snapshot_path: str | Path, csv_path: str | Path) -> int:
    records = _load_snapshot(snapshot_path)
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=REVIEW_COLUMNS)
    writer.writeheader()
    for record in records:
        writer.writerow({
            "candidate_id": record["candidate_id"],
            "decision": "",
            "reviewer": "",
            "review_notes": "",
            "entity_type": record["entity_type"],
            "university_key": record["university_key"],
            "values_json": json.dumps(record["values"], ensure_ascii=False, sort_keys=True),
            "evidence_json": json.dumps(record["evidence"], ensure_ascii=False, sort_keys=True),
            "warnings_json": json.dumps(record["warnings"], ensure_ascii=False),
        })
    _write_atomic(Path(csv_path), output.getvalue().encode("utf-8"))
    return len(records)


def build_release_bundle(
    snapshot_path: str | Path,
    decisions_path: str | Path,
    bundle_path: str | Path,
) -> int:
    records = _load_snapshot(snapshot_path)
    decisions: dict[str, dict[str, str]] = {}
    with Path(decisions_path).open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames is None or not {"candidate_id", "decision", "reviewer"}.issubset(reader.fieldnames):
            raise ReviewError("Decision CSV must contain candidate_id, decision, and reviewer columns.")
        for row in reader:
            candidate_id = (row.get("candidate_id") or "").strip()
            decision = (row.get("decision") or "").strip().lower()
            reviewer = (row.get("reviewer") or "").strip()
            if not candidate_id:
                raise ReviewError("A review row has no candidate_id.")
            if candidate_id in decisions:
                raise ReviewError(f"Duplicate decision for candidate: {candidate_id}")
            if decision not in {"approved", "rejected"}:
                raise ReviewError(f"Decision for {candidate_id} must be approved or rejected.")
            if not reviewer:
                raise ReviewError(f"Reviewer is required for candidate: {candidate_id}")
            source_record = next((item for item in records if item["candidate_id"] == candidate_id), None)
            if source_record is None:
                raise ReviewError(f"Decision CSV contains unknown candidate ID: {candidate_id}")
            expected_snapshot_fields = {
                "entity_type": source_record["entity_type"],
                "university_key": source_record["university_key"],
                "values_json": json.dumps(source_record["values"], ensure_ascii=False, sort_keys=True),
                "evidence_json": json.dumps(source_record["evidence"], ensure_ascii=False, sort_keys=True),
                "warnings_json": json.dumps(source_record["warnings"], ensure_ascii=False),
            }
            for field_name, expected_value in expected_snapshot_fields.items():
                if (row.get(field_name) or "") != expected_value:
                    raise ReviewError(
                        f"Review CSV changed protected source field {field_name} for candidate {candidate_id}."
                    )
            decisions[candidate_id] = {
                "decision": decision,
                "reviewer": reviewer,
                "review_notes": (row.get("review_notes") or "").strip(),
            }

    expected_ids = {record["candidate_id"] for record in records}
    unknown = set(decisions) - expected_ids
    missing = expected_ids - set(decisions)
    if unknown:
        raise ReviewError(f"Decision CSV contains unknown candidate IDs: {sorted(unknown)}")
    if missing:
        raise ReviewError(f"Every candidate needs an explicit decision; missing {len(missing)}.")

    approved = []
    review_log = []
    for record in records:
        decision = decisions[record["candidate_id"]]
        review_log.append({"candidate_id": record["candidate_id"], **decision})
        if decision["decision"] == "approved":
            approved.append(record)

    snapshot_bytes = Path(snapshot_path).read_bytes()
    approved_bytes = b"".join(
        (json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")
        for record in approved
    )
    review_bytes = (json.dumps(review_log, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
    manifest = {
        "format": "profinder-review-release-v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "candidate_count": len(records),
        "approved_count": len(approved),
        "rejected_count": len(records) - len(approved),
        "snapshot_sha256": hashlib.sha256(snapshot_bytes).hexdigest(),
        "approved_records_sha256": hashlib.sha256(approved_bytes).hexdigest(),
        "review_log_sha256": hashlib.sha256(review_bytes).hexdigest(),
        "database_write_performed": False,
        "loader_included": False,
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")

    target = Path(bundle_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".tmp", dir=target.parent)
    os.close(fd)
    try:
        with zipfile.ZipFile(temp_name, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("manifest.json", manifest_bytes)
            archive.writestr("approved.jsonl", approved_bytes)
            archive.writestr("review_log.json", review_bytes)
        os.replace(temp_name, target)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)
    return len(approved)


def _write_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create human-review artifacts; no database loader is provided.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    export_parser = subparsers.add_parser("export", help="Export candidate snapshot to a review CSV.")
    export_parser.add_argument("--input", required=True)
    export_parser.add_argument("--csv", required=True)
    bundle_parser = subparsers.add_parser("bundle", help="Build a checksummed bundle from explicit review decisions.")
    bundle_parser.add_argument("--input", required=True)
    bundle_parser.add_argument("--decisions", required=True)
    bundle_parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        if args.command == "export":
            count = export_review_csv(args.input, args.csv)
            print(f"Review CSV created for {count} candidates: {args.csv}")
        else:
            count = build_release_bundle(args.input, args.decisions, args.output)
            print(f"Review release bundle created with {count} approved candidates: {args.output}")
        print("No application database was opened or modified. No production import was performed.")
    except ReviewError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
