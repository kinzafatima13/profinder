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


def _expanded_table_rows(table: Any) -> list[list[Any]]:
    """Expand HTML row/col spans into a stable rectangular cell grid."""
    expanded: list[list[Any]] = []
    carry: dict[int, tuple[Any, int]] = {}
    for tr in table.find_all("tr"):
        cells = tr.find_all(["th", "td"], recursive=False)
        if not cells and not carry:
            expanded.append([])
            continue
        row: list[Any] = []
        next_carry: dict[int, tuple[Any, int]] = {}
        col = 0
        for cell, remaining in carry.items():
            while len(row) <= cell:
                row.append(None)
            row[cell] = remaining[0]
            if remaining[1] > 1:
                next_carry[cell] = (remaining[0], remaining[1] - 1)
        for node in cells:
            while col < len(row) and row[col] is not None:
                col += 1
            colspan = max(1, int(node.get("colspan", 1) or 1))
            rowspan = max(1, int(node.get("rowspan", 1) or 1))
            for offset in range(colspan):
                target = col + offset
                while len(row) <= target:
                    row.append(None)
                row[target] = node
                if rowspan > 1:
                    next_carry[target] = (node, rowspan - 1)
            col += colspan
        expanded.append(row)
        carry = next_carry
    return expanded


def extract_table_candidates(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    table_selector: str = "table",
    header_row: int = 0,
    column_map: dict[str, str] | None = None,
) -> list[Candidate]:
    """Extract HTML catalogs, expanding rowspan/colspan before mapping columns."""
    soup = BeautifulSoup(source["body"], "html.parser")
    candidates: list[Candidate] = []
    for table_index, table in enumerate(soup.select(table_selector)):
        rows = _expanded_table_rows(table)
        if header_row >= len(rows):
            continue
        headers = [_text(cell) for cell in rows[header_row]]
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

        for row_index, cells in enumerate(rows[header_row + 1 :], start=header_row + 1):
            if not cells:
                continue
            values: dict[str, str] = {}
            evidence: dict[str, Evidence] = {}
            for field_name, column_index in indexes.items():
                if column_index >= len(cells) or cells[column_index] is None:
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



def extract_document_urls(
    source: dict[str, str],
    include_patterns: list[str] | None = None,
    exclude_patterns: list[str] | None = None,
    same_origin_only: bool = True,
    max_results: int = 5,
) -> list[str]:
    """Discover bounded HTTPS PDF candidates from HTML markup and embedded scripts.

    Discovery is local-only: it never fetches a discovered URL. Same-origin is
    enforced by default, and callers must explicitly opt in before downloading.
    """
    from urllib.parse import urlparse

    if max_results < 1 or max_results > 25:
        raise ValueError("max_results must be between 1 and 25.")
    origin = urlparse(source["final_url"])
    include = [re.compile(pattern, re.IGNORECASE) for pattern in (include_patterns or [])]
    exclude = [re.compile(pattern, re.IGNORECASE) for pattern in (exclude_patterns or [])]
    soup = BeautifulSoup(source["body"], "html.parser")
    raw_candidates: list[str] = []

    for node in soup.select("a[href], iframe[src], embed[src], object[data], link[href]"):
        attr = "data" if node.name == "object" else ("src" if node.name in {"iframe", "embed"} else "href")
        value = str(node.get(attr, "")).strip()
        if value:
            raw_candidates.append(value)

    # Script scanning is intentionally limited to literal quoted .pdf URLs.
    pattern = re.compile(r"""["']([^"'<>\\s]+\\.pdf(?:\\?[^"'<>\\s]*)?(?:#[^"'<>\\s]*)?)["']""", re.IGNORECASE)
    raw_candidates.extend(match.group(1) for match in pattern.finditer(source["body"]))

    found: list[str] = []
    for raw in raw_candidates:
        target = urljoin(source["final_url"], raw)
        parsed = urlparse(target)
        if parsed.scheme != "https" or not parsed.hostname:
            continue
        if not parsed.path.lower().endswith(".pdf"):
            continue
        if same_origin_only and (parsed.hostname or "").lower() != (origin.hostname or "").lower():
            continue
        if include and not any(item.search(target) for item in include):
            continue
        if any(item.search(target) for item in exclude):
            continue
        if target not in found:
            found.append(target)
        if len(found) >= max_results:
            break
    return found



def extract_pdf_candidates(
    university_key: str,
    source: dict[str, Any],
    entity_type: str,
    document_name: str,
    max_pages: int = 200,
    max_chars: int = 50000,
) -> list[Candidate]:
    """Extract text from a bounded PDF as a review-only document candidate.

    The configured document_name is explicit source configuration, not inferred
    scholarship metadata. No deadline, eligibility, coverage, or fee is guessed.
    """
    from io import BytesIO
    from pypdf import PdfReader

    if not document_name or not document_name.strip():
        raise ValueError("PDF adapter requires a non-empty document_name.")
    if max_pages < 1 or max_chars < 1:
        raise ValueError("PDF max_pages and max_chars must be positive.")
    try:
        reader = PdfReader(BytesIO(source["pdf_bytes"]))
    except Exception as exc:
        raise ValueError(f"Could not parse PDF document: {exc}") from exc
    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported; do not attempt password guessing.")
    if len(reader.pages) > max_pages:
        raise ValueError(f"PDF has {len(reader.pages)} pages; configured limit is {max_pages}.")

    page_texts: list[str] = []
    warnings: list[str] = ["pdf_text_extraction_review_required"]
    remaining = max_chars
    for page_number, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            warnings.append(f"pdf_page_text_error:{page_number}:{type(exc).__name__}")
            continue
        text = " ".join(text.split())
        if not text:
            warnings.append(f"pdf_page_has_no_extractable_text:{page_number}")
            continue
        if remaining <= 0:
            warnings.append("pdf_text_truncated:max_chars")
            break
        page_text = text[:remaining]
        page_texts.append(f"[Page {page_number}] {page_text}")
        remaining -= len(page_text)
        if len(page_text) < len(text):
            warnings.append("pdf_text_truncated:max_chars")
            break

    if not page_texts:
        warnings.append("pdf_no_text_extracted_ocr_may_be_required")
    description = "\n\n".join(page_texts)
    final_url = source["final_url"]
    collected_at = source["collected_at"]
    values = {"name": document_name.strip(), "description": description} if description else {"name": document_name.strip()}
    evidence = {
        "name": Evidence(final_url, collected_at, "pdf:configured-document-name", document_name.strip()),
    }
    if description:
        evidence["description"] = Evidence(final_url, collected_at, "pdf:pypdf-page-text", description[:300])
    return [Candidate(entity_type, university_key, values, evidence, warnings)]

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


def _jsonld_objects(value: Any) -> list[dict[str, Any]]:
    """Flatten common Schema.org JSON-LD containers without guessing relationships."""
    found: list[dict[str, Any]] = []
    if isinstance(value, list):
        for item in value:
            found.extend(_jsonld_objects(item))
    elif isinstance(value, dict):
        if value.get("@graph") is not None:
            found.extend(_jsonld_objects(value["@graph"]))
        elif isinstance(value.get("itemListElement"), list):
            for item in value["itemListElement"]:
                found.extend(_jsonld_objects(item.get("item", item) if isinstance(item, dict) else item))
        else:
            found.append(value)
    return found


def _jsonld_path(record: dict[str, Any], path: str) -> Any:
    current: Any = record
    for part in path.split("."):
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit() and int(part) < len(current):
            current = current[int(part)]
        else:
            return None
    if isinstance(current, dict):
        return current.get("name") or current.get("@id") or ""
    if isinstance(current, list):
        return "; ".join(str(item.get("name", item)) if isinstance(item, dict) else str(item) for item in current)
    return current


def extract_jsonld_candidates(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    field_map: dict[str, str] | None = None,
) -> list[Candidate]:
    """Extract Schema.org JSON-LD using explicit paths or conservative common fields."""
    import json

    soup = BeautifulSoup(source["body"], "html.parser")
    candidates: list[Candidate] = []
    defaults = {
        "name": "name", "description": "description", "official_url": "url",
        "email": "email", "title": "jobTitle", "department": "department.name",
        "language": "inLanguage", "duration": "timeRequired",
        "degree_level": "educationalLevel",
    }
    mapping = field_map or defaults
    for script_index, script in enumerate(soup.select('script[type="application/ld+json"]')):
        try:
            payload = json.loads(script.string or script.get_text())
        except (ValueError, TypeError):
            continue
        for record_index, record in enumerate(_jsonld_objects(payload)):
            values: dict[str, str] = {}
            evidence: dict[str, Evidence] = {}
            for field_name, path in mapping.items():
                value = _jsonld_path(record, path)
                if value is None:
                    continue
                text_value = " ".join(str(value).split())
                if not text_value:
                    continue
                if field_name.endswith("_url") or field_name in {"profile_url", "official_url", "source_url"}:
                    text_value = urljoin(source["final_url"], text_value)
                values[field_name] = text_value
                evidence[field_name] = _evidence(
                    source, f"jsonld:script:{script_index}:record:{record_index}:path:{path}", text_value
                )
            if values:
                candidates.append(Candidate(entity_type, university_key, values, evidence))
    return candidates


def discover_links(
    source: dict[str, str],
    include_patterns: list[str] | None = None,
    exclude_patterns: list[str] | None = None,
    same_origin_only: bool = True,
) -> list[str]:
    """Discover candidate source links; never fetch them automatically."""
    from urllib.parse import urlparse

    origin = urlparse(source["final_url"])
    include = [re.compile(pattern, re.IGNORECASE) for pattern in (include_patterns or [])]
    exclude = [re.compile(pattern, re.IGNORECASE) for pattern in (exclude_patterns or [])]
    soup = BeautifulSoup(source["body"], "html.parser")
    results: list[str] = []
    for anchor in soup.select("a[href]"):
        href = str(anchor.get("href", "")).strip()
        if not href or href.startswith(("#", "mailto:", "javascript:", "tel:")):
            continue
        target = urljoin(source["final_url"], href)
        parsed = urlparse(target)
        if parsed.scheme != "https" or not parsed.hostname:
            continue
        if same_origin_only and (parsed.hostname or "").lower() != (origin.hostname or "").lower():
            continue
        if include and not any(pattern.search(target) for pattern in include):
            continue
        if any(pattern.search(target) for pattern in exclude):
            continue
        if target not in results:
            results.append(target)
    return results


def extract_with_adapter(
    university_key: str,
    source: dict[str, str],
    entity_type: str,
    adapter: dict[str, Any],
) -> list[Candidate]:
    """Dispatch a reviewed source configuration to a shared extraction adapter."""
    adapter_type = str(adapter.get("type", "css")).strip().lower()
    if adapter_type == "css":
        if not adapter.get("record_selector") or not isinstance(adapter.get("field_selectors"), dict):
            raise ValueError("CSS adapter requires record_selector and field_selectors.")
        return extract_candidates(university_key, source, entity_type, adapter["record_selector"], adapter["field_selectors"])
    if adapter_type == "table":
        return extract_table_candidates(
            university_key, source, entity_type,
            str(adapter.get("table_selector", "table")),
            int(adapter.get("header_row", 0)), adapter.get("column_map"),
        )
    if adapter_type == "article_list":
        return extract_article_list_candidates(
            university_key, source, entity_type,
            str(adapter.get("item_selector", "article li")),
            adapter.get("title_selector"), adapter.get("context_selector"),
        )
    if adapter_type == "jsonld":
        return extract_jsonld_candidates(university_key, source, entity_type, adapter.get("field_map"))
    if adapter_type == "pdf":
        return extract_pdf_candidates(
            university_key, source, entity_type,
            str(adapter.get("document_name", "")),
            int(adapter.get("max_pages", 200)), int(adapter.get("max_chars", 50000)),
        )
    raise ValueError(f"Unsupported adapter type: {adapter_type}")


def discover_sitemap_urls(
    xml_text: str,
    sitemap_url: str,
    include_patterns: list[str] | None = None,
    exclude_patterns: list[str] | None = None,
    same_origin_only: bool = True,
    max_urls: int = 5000,
) -> list[str]:
    """Extract bounded URL locations from sitemap XML; never fetch discovered URLs."""
    import xml.etree.ElementTree as ET
    from urllib.parse import urlparse

    if max_urls < 1:
        raise ValueError("max_urls must be at least 1.")
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid sitemap XML: {exc}") from exc

    origin = urlparse(sitemap_url)
    include = [re.compile(pattern, re.IGNORECASE) for pattern in (include_patterns or [])]
    exclude = [re.compile(pattern, re.IGNORECASE) for pattern in (exclude_patterns or [])]
    results: list[str] = []
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1].lower() != "loc" or not element.text:
            continue
        target = urljoin(sitemap_url, element.text.strip())
        parsed = urlparse(target)
        if parsed.scheme != "https" or not parsed.hostname:
            continue
        if same_origin_only and (parsed.hostname or "").lower() != (origin.hostname or "").lower():
            continue
        if include and not any(pattern.search(target) for pattern in include):
            continue
        if any(pattern.search(target) for pattern in exclude):
            continue
        if target not in results:
            results.append(target)
        if len(results) >= max_urls:
            break
    return results
