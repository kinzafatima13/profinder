from __future__ import annotations

from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .models import Candidate, Evidence


def _text(node: Any) -> str:
    return " ".join(node.get_text(" ", strip=True).split()) if node else ""


def extract_candidates(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    record_selector: str,
    field_selectors: dict[str, str],
) -> list[Candidate]:
    """Extract repeated records using a reviewed CSS adapter configuration.

    record_selector identifies one card/row per entity. Each field selector is
    evaluated relative to that record. Use "." or ":self" to read the record's
    own text. Attribute selectors can be written as "a::attr(href)" or
    "time::attr(datetime)".
    """
    soup = BeautifulSoup(source["body"], "html.parser")
    records = soup.select(record_selector)
    candidates: list[Candidate] = []

    for record in records:
        values: dict[str, str] = {}
        evidence: dict[str, Evidence] = {}
        for field_name, selector in field_selectors.items():
            value = ""
            if selector in (".", ":self"):
                value = _text(record)
            elif "::attr(" in selector and selector.endswith(")"):
                css, attr = selector.rsplit("::attr(", 1)
                node = record.select_one(css)
                value = str(node.get(attr[:-1], "")).strip() if node else ""
            else:
                value = _text(record.select_one(selector))
            if value:
                if field_name.endswith("_url") or field_name === "profile_url" or field_name === "official_url" or field_name === "source_url":
                    value = urljoin(source["final_url"], value)
                values[field_name] = value
                evidence[field_name] = Evidence(
                    source_url=source["final_url"],
                    collected_at=source["collected_at"],
                    extractor=f"css:{record_selector} -> {selector}",
                    excerpt=value[:300],
                )
        if values:
            candidates.append(Candidate(entity_type, university_key, values, evidence))
    return candidates
