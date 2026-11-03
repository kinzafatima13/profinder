from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class Evidence:
    source_url: str
    collected_at: str
    extractor: str
    excerpt: str = ""


@dataclass
class Candidate:
    entity_type: str
    university_key: str
    values: dict[str, Any]
    evidence: dict[str, Evidence] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "university_key": self.university_key,
            "values": self.values,
            "evidence": {key: asdict(value) for key, value in self.evidence.items()},
            "warnings": self.warnings,
        }


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
