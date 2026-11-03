from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


class RegistryError(ValueError):
    pass


def load_registry(path: str | Path) -> dict[str, dict[str, Any]]:
    source = Path(path)
    if not source.is_file():
        raise RegistryError(f"University registry not found: {source}")
    raw = yaml.safe_load(source.read_text(encoding="utf-8")) or {}
    universities = raw.get("universities")
    if not isinstance(universities, list):
        raise RegistryError("Registry must contain a 'universities' list.")

    result: dict[str, dict[str, Any]] = {}
    for item in universities:
        if not isinstance(item, dict):
            raise RegistryError("Each university entry must be a mapping.")
        key = str(item.get("key", "")).strip()
        name = str(item.get("name", "")).strip()
        if not key or not name:
            raise RegistryError("Every university requires a stable key and name.")
        if key in result:
            raise RegistryError(f"Duplicate university key: {key}")
        sources = item.get("sources", [])
        if not isinstance(sources, list):
            raise RegistryError(f"'sources' must be a list for {key}.")
        for source in sources:
            if not isinstance(source, dict) or not source.get("url"):
                raise RegistryError(f"Every source for {key} needs a URL.")
            if not str(source["url"]).startswith("https://"):
                raise RegistryError(f"Only HTTPS sources are allowed: {source['url']}")
        result[key] = item
    return result
