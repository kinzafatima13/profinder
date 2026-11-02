from __future__ import annotations

from .models import Candidate

REQUIRED_FIELDS = {
    "university": ("name",),
    "program": ("name",),
    "professor": ("name",),
    "scholarship": ("name",),
}


def validate_candidate(candidate: Candidate) -> Candidate:
    required = REQUIRED_FIELDS.get(candidate.entity_type, ())
    for field_name in required:
        if not str(candidate.values.get(field_name, "")).strip():
            candidate.warnings.append(f"missing_required:{field_name}")
    if not candidate.evidence:
        candidate.warnings.append("missing_source_evidence")
    for field_name in ("deadline", "application_fee", "tuition", "coverage", "start_date"):
        if field_name in candidate.values:
            candidate.warnings.append(f"human_review_required:{field_name}")
    if candidate.entity_type not in REQUIRED_FIELDS:
        candidate.warnings.append(f"unknown_entity_type:{candidate.entity_type}")
    return candidate
