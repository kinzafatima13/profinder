from __future__ import annotations

import re
import unicodedata
from typing import Any

# Shared canonical field vocabulary. University-specific adapters map source
# labels/selectors into these names; downstream validation/review stays generic.
CANONICAL_FIELDS: dict[str, tuple[str, ...]] = {
    "university": ("name", "country", "city", "official_url", "source_url"),
    "program": ("name", "degree_level", "field", "language", "duration", "tuition", "application_fee", "deadline", "start_date", "official_url", "source_url"),
    "professor": ("name", "title", "department", "research_interests", "email", "profile_url", "orcid", "source_url"),
    "scholarship": ("name", "provider", "degree_level", "coverage", "eligibility", "deadline", "official_url", "source_url"),
}

ALIASES = {
    "programme": "name", "programme_name": "name", "program_name": "name", "course_name": "name",
    "professor_name": "name", "faculty_name": "name", "academic_name": "name",
    "professor_email": "email", "contact_email": "email",
    "application_deadline": "deadline", "closing_date": "deadline",
    "application_cost": "application_fee", "fee": "application_fee",
    "annual_tuition": "tuition", "tuition_fee": "tuition",
    "official_website": "official_url", "website": "official_url",
    "profile": "profile_url", "faculty_profile": "profile_url",
    "research_area": "research_interests", "research_interest": "research_interests",
}


def canonical_key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value).strip("_")
    return ALIASES.get(value, value)


def normalize_values(entity_type: str, values: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    allowed = set(CANONICAL_FIELDS.get(entity_type, ()))
    normalized: dict[str, Any] = {}
    warnings: list[str] = []
    for raw_key, raw_value in values.items():
        key = canonical_key(raw_key)
        if key not in allowed:
            warnings.append(f"unmapped_field:{raw_key}")
            continue
        if raw_value is None:
            continue
        value = " ".join(str(raw_value).split())
        if not value:
            continue
        if key in normalized and normalized[key] != value:
            warnings.append(f"field_collision:{key}")
            continue
        normalized[key] = value
    return normalized, warnings
