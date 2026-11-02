import unittest

from profinder_pipeline.extract import extract_candidates
from profinder_pipeline.normalize import normalize_values
from profinder_pipeline.registry import RegistryError, load_registry
from profinder_pipeline.validate import validate_candidate


class PipelineTests(unittest.TestCase):
    def test_registry_requires_https_and_unique_keys(self):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "registry.yml"
            path.write_text("universities:\n  - key: x\n    name: X\n    sources:\n      - url: http://bad.example\n", encoding="utf-8")
            with self.assertRaises(RegistryError):
                load_registry(path)

    def test_extractor_records_field_level_evidence(self):
        source = {
            "body": '<div class="card"><h2>MS Computer Science</h2><span class="lang">English</span></div>',
            "final_url": "https://university.example/programs",
            "collected_at": "2026-11-02T00:00:00+00:00",
        }
        candidates = extract_candidates(
            "u1", source, "program", ".card", {"name": "h2", "language": ".lang"}
        )
        self.assertEqual(candidates[0].values, {"name": "MS Computer Science", "language": "English"})
        self.assertEqual(candidates[0].evidence["name"].source_url, source["final_url"])

    def test_normalization_maps_common_source_labels(self):
        values, warnings = normalize_values("program", {"Programme Name": " MSc AI ", "Application Deadline": "2027-01-15", "Unknown": "x"})
        self.assertEqual(values, {"name": "MSc AI", "deadline": "2027-01-15"})
        self.assertIn("unmapped_field:Unknown", warnings)

    def test_high_risk_fields_require_review(self):
        from profinder_pipeline.models import Candidate, Evidence

        candidate = Candidate(
            "scholarship", "u1", {"name": "Award", "deadline": "2027-01-01"},
            {"name": Evidence("https://u.example", "2026-11-02", "test")},
        )
        result = validate_candidate(candidate)
        self.assertIn("human_review_required:deadline", result.warnings)


if __name__ == "__main__":
    unittest.main()
