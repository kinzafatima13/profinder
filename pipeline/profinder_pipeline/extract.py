from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .models import Candidate, Evidence
from .normalize import canonical_key


def _text(node: Any) -> str:
    return " ".join(node.get_text(" ", strip=True).split()) if node else ""


def _evidence(source: dict[str, str], extractor: str, excerpt: str) -> Evidence:
    return Evidence(
        source_url=source["final_url"],
        collected_at=source["collected_at"],
        extractor=extractor,
        excerpt=excerpt[:300],
    )


def _absolute_url(field_name: str, value: str, source: dict[str, str]) -> str:
    if field_name.endswith("_url") or field_name in {"profile_url", "official_url", "source_url"}:
        return urljoin(source["final_url"], value)
    return value


def extract_candidates(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    record_selector: str,
    field_selectors: dict[str, str],
) -> list[Candidate]:
    """Extract repeated HTML cards/rows using reviewed CSS selectors."""
    soup = BeautifulSoup(source["body"], "html.parser")
    records = soup.select(record_selector)
    candidates: list[Candidate] = []

    for record in records:
        values: dict[str, str] = {}
        evidence: dict[str, Evidence] = {}
        for field_name, selector in field_selectors.items():
            if selector in (".", ":self"):
                value = _text(record)
            elif "::attr(" in selector and selector.endswith(")"):
                css, attr = selector.rsplit("::attr(", 1)
                node = record.select_one(css)
                value = str(node.get(attr[:-1], "")).strip() if node else ""
            else:
                value = _text(record.select_one(selector))
            if value:
                value = _absolute_url(field_name, value, source)
                values[field_name] = value
                evidence[field_name] = _evidence(
                    source, f"css:{record_selector} -> {selector}", value
                )
        if values:
            candidates.append(Candidate(entity_type, university_key, values, evidence))
    return candidates


def extract_table_candidates(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    table_selector: str = "table",
    header_row: int = 0,
    column_map: dict[str, str] | None = None,
) -> list[Candidate]:
    """Extract tabular catalogs by mapping visible header labels to canonical fields.

    column_map optionally maps canonical field names to zero-based column indexes.
    Without it, headers are normalized through the shared alias vocabulary.
    Rows without a usable name are ignored rather than guessed.
    """
    soup = BeautifulSoup(source["body"], "html.parser")
    candidates: list[Candidate] = []
    for table_index, table in enumerate(soup.select(table_selector)):
        rows = table.find_all("tr")
        if header_row >= len(rows):
            continue
        headers = [_text(cell) for cell in rows[header_row].find_all(["th", "td"], recursive=False)]
        if not headers:
            continue
        indexes: dict[str, int] = {}
        if column_map:
            indexes = {field: int(index) for field, index in column_map.items()}
        else:
            for index, label in enumerate(headers):
                key = canonical_key(label)
                if key and key not in indexes:
                    indexes[key] = index

        for row_index, row in enumerate(rows[header_row + 1 :], start=header_row + 1):
            cells = row.find_all(["th", "td"], recursive=False)
            if not cells:
                continue
            values: dict[str, str] = {}
            evidence: dict[str, Evidence] = {}
            for field_name, column_index in indexes.items():
                if column_index >= len(cells):
                    continue
                cell = cells[column_index]
                value = _text(cell)
                link = cell.find("a", href=True)
                if field_name.endswith("_url") and link:
                    value = urljoin(source["final_url"], link["href"])
                if value:
                    values[field_name] = value
                    evidence[field_name] = _evidence(
                        source,
                        f"table:{table_selector}[{table_index}] row:{row_index} column:{column_index} header:{headers[column_index] if column_index < len(headers) else field_name}",
                        value,
                    )
            if values.get("name"):
                candidates.append(Candidate(entity_type, university_key, values, evidence))
    return candidates


def extract_article_list_candidates(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    item_selector: str = "article li",
    title_selector: str | None = None,
    context_selector: str | None = None,
) -> list[Candidate]:
    """Extract explicitly enumerated article/list items without inventing missing fields.

    Each selected list item becomes one candidate. The item text is stored as
    the name unless a title selector is configured. Optional context is retained
    as description; source-specific field interpretation remains a reviewed task.
    """
    soup = BeautifulSoup(source["body"], "html.parser")
    candidates: list[Candidate] = []
    for index, item in enumerate(soup.select(item_selector)):
        name_node = item.select_one(title_selector) if title_selector else item
        name = _text(name_node)
        if not name:
            continue
        values = {"name": name}
        evidence = {"name": _evidence(source, f"article-list:{item_selector}[{index}]", name)}
        if context_selector:
            context = item.select_one(context_selector)
            description = _text(context)
            if description:
                values["description"] = description
                evidence["description"] = _evidence(
                    source, f"article-context:{context_selector}", description
                )
        candidates.append(Candidate(entity_type, university_key, values, evidence))
    return candidates
