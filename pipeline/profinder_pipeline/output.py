from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path

from .models import Candidate


def candidate_fingerprint(candidate: Candidate) -> str:
    """Return a stable identity for the same normalized academic record."""
    identity = {
        "entity_type": candidate.entity_type,
        "university_key": candidate.university_key,
        "values": candidate.values,
    }
    canonical = json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def deduplicate_candidates(candidates: list[Candidate]) -> tuple[list[Candidate], int]:
    """Deduplicate exact normalized records while retaining available evidence."""
    unique: dict[str, Candidate] = {}
    duplicates = 0

    for candidate in candidates:
        fingerprint = candidate_fingerprint(candidate)
        existing = unique.get(fingerprint)
        if existing is None:
            unique[fingerprint] = candidate
            continue

        duplicates += 1
        for field_name, evidence in candidate.evidence.items():
            existing.evidence.setdefault(field_name, evidence)
        for warning in candidate.warnings:
            if warning not in existing.warnings:
                existing.warnings.append(warning)

    return list(unique.values()), duplicates


def write_jsonl_atomic(path: str | Path, candidates: list[Candidate]) -> None:
    """Replace the previous snapshot atomically; never append partial/repeated runs."""
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=output.parent,
            prefix=f".{output.name}.",
            suffix=".tmp",
            delete=False,
        ) as stream:
            temporary_path = stream.name
            for candidate in candidates:
                record = candidate.to_dict()
                record["candidate_id"] = candidate_fingerprint(candidate)
                stream.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\\n")
            stream.flush()
            os.fsync(stream.fileno())

        os.replace(temporary_path, output)
        temporary_path = None
    finally:
        if temporary_path is not None:
            try:
                os.unlink(temporary_path)
            except FileNotFoundError:
                pass
