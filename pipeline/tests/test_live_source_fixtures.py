from __future__ import annotations

import json
import unittest
from datetime import datetime, timezone
from pathlib import Path

from profinder_pipeline.extract import extract_candidates, extract_document_urls, extract_table_candidates
from profinder_pipeline.normalize import normalize_values
from profinder_pipeline.output import deduplicate_candidates
from profinder_pipeline.validate import validate_candidate

FIXTURES = Path(__file__).parent / "fixtures" / "live"


class LiveUniversityFixtureTests(unittest.TestCase):
    """Regression tests against HTML fragments captured from official university sites."""

    def _source(self, filename: str, url: str) -> dict[str, str]:
        return {
            "body": (FIXTURES / filename).read_text(encoding="utf-8", errors="replace"),
            "final_url": url,
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }

    def test_shanghai_maritime_bilingual_program_catalog(self):
        source = self._source(
            "shmtu.html",
            "https://en.shmtu.edu.cn/2026/1023/c6283a333085/page.htm",
        )
        candidates = extract_table_candidates(
            "shmtu", source, "program", table_selector="table", header_row=1
        )
        normalized = []
        for candidate in candidates:
            candidate.values, warnings = normalize_values("program", candidate.values)
            candidate.warnings.extend(warnings)
            validate_candidate(candidate)
            normalized.append(candidate)

        unique, duplicates = deduplicate_candidates(normalized)
        self.assertEqual(len(unique), 2)
        self.assertEqual(duplicates, 2)
        computer_technology = next(
            item for item in unique if "Computer Technology" in item.values["name"]
        )
        self.assertIn("Information Engineering College", computer_technology.values["department"])
        self.assertIn("English", computer_technology.values["language"])
        self.assertEqual(computer_technology.values["duration"], "3年/3years")
        self.assertIn("degree_type", computer_technology.values)
        self.assertEqual(computer_technology.warnings, [])
        self.assertIn("name", computer_technology.evidence)
        self.assertTrue(computer_technology.evidence["name"].source_url.startswith("https://en.shmtu.edu.cn/"))

    def test_yangtze_scholarship_announcement_title_is_extracted_with_evidence(self):
        source = self._source(
            "yangtze_scholarship.html",
            "https://english.yangtzeu.edu.cn/info/1022/1101.htm",
        )
        candidates = extract_candidates(
            "yangtze-university",
            source,
            "scholarship",
            ".wznr-wrap",
            {"name": ".title"},
        )
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        candidate.values, warnings = normalize_values("scholarship", candidate.values)
        candidate.warnings.extend(warnings)
        validate_candidate(candidate)
        self.assertIn("CSC SILK ROAD Scholarship Program", candidate.values["name"])
        self.assertIn("2026-2027", candidate.values["name"])
        self.assertIn("name", candidate.evidence)
        self.assertEqual(candidate.evidence["name"].source_url, source["final_url"])
        self.assertEqual(candidate.warnings, [])
        document_urls = extract_document_urls(source)
        self.assertEqual(len(document_urls), 1)
        self.assertTrue(document_urls[0].endswith(".pdf"))
        self.assertTrue(document_urls[0].startswith("https://english.yangtzeu.edu.cn/"))

    def test_fixture_manifest_hashes_match_saved_html(self):
        manifest = json.loads((FIXTURES / "manifest.json").read_text(encoding="utf-8"))
        for item in manifest["fixtures"]:
            if item.get("file") and item["file"].endswith(".html"):
                data = (FIXTURES / item["file"]).read_bytes()
                self.assertGreater(len(data), 100)
                self.assertTrue(data.lstrip().startswith(b"<"))


if __name__ == "__main__":
    unittest.main()
