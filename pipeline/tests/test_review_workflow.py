import csv
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from profinder_pipeline.models import Candidate, Evidence
from profinder_pipeline.output import write_jsonl_atomic
from profinder_pipeline.review import ReviewError, build_release_bundle, export_review_csv


class ReviewWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.snapshot = self.root / "candidates.jsonl"
        self.csv_path = self.root / "review.csv"
        self.bundle = self.root / "release.zip"
        self.candidates = [
            Candidate("program", "u1", {"name": "MSc AI"}, {
                "name": Evidence("https://uni.example/programs", "2026-11-02T00:00:00Z", "fixture")
            }),
            Candidate("scholarship", "u1", {"name": "CSC Award"}, {
                "name": Evidence("https://uni.example/scholarships", "2026-11-02T00:00:00Z", "fixture")
            }),
        ]
        write_jsonl_atomic(self.snapshot, self.candidates)

    def tearDown(self):
        self.temp.cleanup()

    def test_export_contains_all_candidates_and_blank_decisions(self):
        self.assertEqual(export_review_csv(self.snapshot, self.csv_path), 2)
        with self.csv_path.open(encoding="utf-8", newline="") as stream:
            rows = list(csv.DictReader(stream))
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(row["decision"] == "" for row in rows))
        self.assertTrue(all(row["reviewer"] == "" for row in rows))

    def test_bundle_requires_explicit_decision_for_every_candidate(self):
        export_review_csv(self.snapshot, self.csv_path)
        with self.csv_path.open(encoding="utf-8", newline="") as stream:
            rows = list(csv.DictReader(stream))
        rows[0]["decision"] = "approved"
        rows[0]["reviewer"] = "reviewer@example.org"
        with self.csv_path.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        with self.assertRaises(ReviewError):
            build_release_bundle(self.snapshot, self.csv_path, self.bundle)
        self.assertFalse(self.bundle.exists())

    def test_bundle_contains_only_approved_records_and_checksums(self):
        export_review_csv(self.snapshot, self.csv_path)
        with self.csv_path.open(encoding="utf-8", newline="") as stream:
            rows = list(csv.DictReader(stream))
        rows[0]["decision"] = "approved"
        rows[1]["decision"] = "rejected"
        for row in rows:
            row["reviewer"] = "reviewer@example.org"
        with self.csv_path.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        self.assertEqual(build_release_bundle(self.snapshot, self.csv_path, self.bundle), 1)
        with zipfile.ZipFile(self.bundle) as archive:
            manifest = json.loads(archive.read("manifest.json"))
            approved = [json.loads(line) for line in archive.read("approved.jsonl").decode().splitlines()]
        self.assertEqual(len(approved), 1)
        self.assertEqual(approved[0]["values"]["name"], "MSc AI")
        self.assertEqual(manifest["approved_count"], 1)
        self.assertFalse(manifest["database_write_performed"])
        self.assertFalse(manifest["loader_included"])

    def test_tampered_candidate_fingerprint_is_rejected(self):
        data = self.snapshot.read_text(encoding="utf-8").replace("MSc AI", "Tampered")
        self.snapshot.write_text(data, encoding="utf-8")
        with self.assertRaises(ReviewError):
            export_review_csv(self.snapshot, self.csv_path)

    def test_review_csv_cannot_change_source_evidence(self):
        export_review_csv(self.snapshot, self.csv_path)
        with self.csv_path.open(encoding="utf-8", newline="") as stream:
            rows = list(csv.DictReader(stream))
        rows[0]["decision"] = "approved"
        rows[0]["reviewer"] = "reviewer@example.org"
        rows[0]["evidence_json"] = "{}"
        rows[1]["decision"] = "rejected"
        rows[1]["reviewer"] = "reviewer@example.org"
        with self.csv_path.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        with self.assertRaises(ReviewError):
            build_release_bundle(self.snapshot, self.csv_path, self.bundle)
        self.assertFalse(self.bundle.exists())


if __name__ == "__main__":
    unittest.main()
