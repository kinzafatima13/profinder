import json
import tempfile
import unittest
from pathlib import Path

from profinder_pipeline.extract import extract_candidates
from profinder_pipeline.models import Candidate, Evidence
from profinder_pipeline.normalize import normalize_values
from profinder_pipeline.output import (
    candidate_fingerprint,
    deduplicate_candidates,
    write_jsonl_atomic,
)
from profinder_pipeline.registry import RegistryError, load_registry
from profinder_pipeline.validate import validate_candidate


class PipelineTests(unittest.TestCase):
    def test_registry_requires_https_and_unique_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "registry.yml"
            path.write_text(
                "universities:\n  - key: x\n    name: X\n    sources:\n      - url: http://bad.example\n",
                encoding="utf-8",
            )
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
        values, warnings = normalize_values(
            "program",
            {"Programme Name": " MSc AI ", "Application Deadline": "2027-01-15", "Unknown": "x"},
        )
        self.assertEqual(values, {"name": "MSc AI", "deadline": "2027-01-15"})
        self.assertIn("unmapped_field:Unknown", warnings)

    def test_high_risk_fields_require_review(self):
        candidate = Candidate(
            "scholarship",
            "u1",
            {"name": "Award", "deadline": "2027-01-01"},
            {"name": Evidence("https://u.example", "2026-11-02", "test")},
        )
        result = validate_candidate(candidate)
        self.assertIn("human_review_required:deadline", result.warnings)

    def test_candidate_fingerprint_is_stable(self):
        first = Candidate("program", "u1", {"name": "MSc AI", "language": "English"})
        reordered = Candidate("program", "u1", {"language": "English", "name": "MSc AI"})
        self.assertEqual(candidate_fingerprint(first), candidate_fingerprint(reordered))

    def test_duplicate_candidates_are_removed_and_evidence_is_retained(self):
        first = Candidate(
            "program",
            "u1",
            {"name": "MSc AI"},
            {"name": Evidence("https://u.example/programs", "2026-11-02", "css:.card")},
        )
        duplicate = Candidate(
            "program",
            "u1",
            {"name": "MSc AI"},
            {"name": Evidence("https://u.example/graduate", "2026-11-02", "css:.row")},
            ["review_note"],
        )
        unique, duplicate_count = deduplicate_candidates([first, duplicate])
        self.assertEqual(len(unique), 1)
        self.assertEqual(duplicate_count, 1)
        self.assertEqual(unique[0].evidence["name"].source_url, "https://u.example/programs")
        self.assertIn("review_note", unique[0].warnings)

    def test_output_replaces_previous_snapshot_instead_of_appending(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidates.jsonl"
            old = Candidate("program", "u1", {"name": "Old"})
            new = Candidate("program", "u1", {"name": "New"})

            write_jsonl_atomic(output, [old])
            write_jsonl_atomic(output, [new])

            lines = output.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 1)
            record = json.loads(lines[0])
            self.assertEqual(record["values"]["name"], "New")
            self.assertEqual(record["candidate_id"], candidate_fingerprint(new))

    def test_failed_write_preserves_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidates.jsonl"
            previous = Candidate("program", "u1", {"name": "Keep me"})
            write_jsonl_atomic(output, [previous])
            before = output.read_text(encoding="utf-8")

            invalid = Candidate("program", "u1", {"name": object()})
            with self.assertRaises(TypeError):
                write_jsonl_atomic(output, [invalid])

            self.assertEqual(output.read_text(encoding="utf-8"), before)
            self.assertEqual(list(Path(directory).glob("*.tmp")), [])


if __name__ == "__main__":
    unittest.main()
