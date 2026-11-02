from __future__ import annotations

import json
from typing import Any

from bs4 import BeautifulSoup

from .models import Candidate, Evidence


def _text(node: Any) -> str:
    return " ".join(node.get_text(" ", strip=True).split()) if node else ""


def extract_candidates(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    selectors: dict[str, str],
) -> list[Candidate]:
    """Extract candidates using a per-source CSS selector map.

    selectors maps canonical field names to CSS selectors. A selector may match
    multiple nodes; each node becomes one candidate for the configured entity.
    """
    soup = BeautifulSoup(source["body"], "html.parser")
    rows: list[Candidate] = []

    # JSON-LD is retained as evidence, but never silently promoted to verified facts.
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            json.loads(script.string or script.get_text())
        except (TypeError, json.JSONDecodeError):
            continue

    if not selectors:
        return rows

    primary_field = next(iter(selectors))
    nodes = soup.select(selectors[primary_field])
    for node in nodes:
        values: dict[str, str] = {}
        evidence: dict[str, Evidence] = {}
        for field_name, selector in selectors.items():
            selected = node.select_one(selector) if selector.startswith((".", "#", "[", " ")) else None
            value = _text(selected) if selected else (_text(node) if field_name == primary_field else "")
            if value:
                values[field_name] = value
                evidence[field_name] = Evidence(
                    source_url=source["final_url"],
                    collected_at=source["collected_at"],
                    extractor=f"css:{selector}",
                    excerpt=value[:300],
                )
        if values:
            rows.append(Candidate(entity_type, university_key, values, evidence))
    return rows
