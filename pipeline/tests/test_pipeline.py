import json
import tempfile
import unittest
from unittest.mock import Mock
import urllib.error
from pathlib import Path

from profinder_pipeline.extract import (
    extract_article_list_candidates,
    extract_candidates,
    extract_table_candidates,
)
from profinder_pipeline.fetch import FetchError, PoliteFetcher
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


    def test_table_extractor_maps_bilingual_catalog_headers(self):
        source = {
            "body": """
            <table><tr><th>College/学院</th><th>Major/专业名称</th>
            <th>Language used in Teaching/授课语言</th><th>Study Period/学习期间</th></tr>
            <tr><td>Information Engineering College</td><td>Computer Technology</td>
            <td>English</td><td>3 years</td></tr></table>
            """,
            "final_url": "https://catalog.example.edu/programs",
            "collected_at": "2026-11-02T00:00:00+00:00",
        }
        candidates = extract_table_candidates("sample-u", source, "program")
        self.assertEqual(len(candidates), 1)
        values, warnings = normalize_values("program", candidates[0].values)
        self.assertEqual(values["name"], "Computer Technology")
        self.assertEqual(values["department"], "Information Engineering College")
        self.assertEqual(values["language"], "English")
        self.assertEqual(values["duration"], "3 years")
        self.assertEqual(warnings, [])
        self.assertIn("name", candidates[0].evidence)
        self.assertIn("table:", candidates[0].evidence["name"].extractor)

    def test_table_extractor_supports_explicit_column_map_and_links(self):
        source = {
            "body": '<table><tr><th>名称</th><th>详情</th></tr>'
                    '<tr><td>MSc AI</td><td><a href="../ai">Official page</a></td></tr></table>',
            "final_url": "https://university.example/admissions/catalog",
            "collected_at": "2026-11-02T00:00:00+00:00",
        }
        candidates = extract_table_candidates(
            "sample-u", source, "program",
            column_map={"name": 0, "official_url": 1},
        )
        self.assertEqual(candidates[0].values["official_url"],
                         "https://university.example/ai")

    def test_article_list_extractor_keeps_only_observed_text(self):
        source = {
            "body": '<article><ul><li><strong>Computer Science</strong>'
                    '<p>Research-led postgraduate study</p></li>'
                    '<li><strong>Software Engineering</strong></li></ul></article>',
            "final_url": "https://university.example/admissions",
            "collected_at": "2026-11-02T00:00:00+00:00",
        }
        candidates = extract_article_list_candidates(
            "sample-u", source, "program", "article li", "strong", "p"
        )
        self.assertEqual(len(candidates), 2)
        self.assertEqual(candidates[0].values["name"], "Computer Science")
        values, warnings = normalize_values("program", candidates[0].values)
        self.assertEqual(values["description"], "Research-led postgraduate study")

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


    def test_redirect_checks_robots_for_each_destination_host(self):
        class Response:
            def __init__(self, code, headers=None, body=b""):
                self.code = code
                self.headers = headers or {}
                self._body = body
            def read(self, *args):
                return self._body
            def close(self):
                pass

        with tempfile.TemporaryDirectory() as directory:
            fetcher = PoliteFetcher(directory, min_host_interval=0, sleep=lambda _: None)
            checked_hosts = []
            class Robots:
                def can_fetch(self, agent, url):
                    return True
            def robots_for(base):
                checked_hosts.append(base)
                return Robots()
            fetcher._robots_for = robots_for
            responses = iter([
                Response(302, {"Location": "https://faculty.example.edu/staff"}),
                Response(200, {"Content-Type": "text/html"}, b"<html>ok</html>"),
            ])
            fetcher._request = lambda url, headers: next(responses)
            result = fetcher.fetch("https://www.example.edu/faculty")
            self.assertEqual(result["final_url"], "https://faculty.example.edu/staff")
            self.assertEqual(
                checked_hosts,
                ["https://www.example.edu", "https://faculty.example.edu"],
            )

    def test_redirect_to_http_is_rejected_before_destination_request(self):
        class Response:
            code = 302
            headers = {"Location": "http://insecure.example.edu/page"}
            def close(self):
                pass
        with tempfile.TemporaryDirectory() as directory:
            fetcher = PoliteFetcher(directory, min_host_interval=0, sleep=lambda _: None)
            class Robots:
                def can_fetch(self, agent, url):
                    return True
            fetcher._robots_for = lambda base: Robots()
            fetcher._request = lambda url, headers: Response()
            with self.assertRaises(FetchError):
                fetcher.fetch("https://secure.example.edu/page")

    def test_rate_limit_retries_and_honors_retry_after(self):
        with tempfile.TemporaryDirectory() as directory:
            delays = []
            fetcher = PoliteFetcher(
                directory, min_host_interval=0, max_retries=2, sleep=delays.append
            )
            class Response:
                code = 200
                headers = {"Content-Type": "text/html"}
                def close(self):
                    pass
            calls = {"count": 0}
            def open_request(request, timeout):
                calls["count"] += 1
                if calls["count"] == 1:
                    raise urllib.error.HTTPError(
                        request.full_url, 429, "Too Many Requests",
                        {"Retry-After": "3"}, None
                    )
                return Response()
            fetcher._opener = Mock()
            fetcher._opener.open.side_effect = open_request
            response = fetcher._request("https://example.edu/page", {"User-Agent": "test"})
            self.assertEqual(response.code, 200)
            self.assertEqual(calls["count"], 2)
            self.assertIn(3.0, delays)

    def test_repeat_collection_from_same_saved_html_is_idempotent(self):
        fixture = (
            '<div class="program"><h2>MSc Artificial Intelligence</h2>'
            '<span class="language">English</span></div>'
            '<div class="program"><h2>MS Computer Science</h2>'
            '<span class="language">English</span></div>'
        )
        source = {
            "body": fixture,
            "final_url": "https://university.example/graduate-programs",
            "collected_at": "2026-11-02T00:00:00+00:00",
        }
        selector_map = {"Programme Name": "h2", "Language": ".language"}

        def collect_snapshot(path):
            extracted = extract_candidates(
                "sample-university", source, "program", ".program", selector_map
            )
            normalized = []
            for candidate in extracted:
                values, warnings = normalize_values(candidate.entity_type, candidate.values)
                normalized.append(validate_candidate(Candidate(
                    candidate.entity_type,
                    candidate.university_key,
                    values,
                    {key: value for key, value in candidate.evidence.items()},
                    candidate.warnings + warnings,
                )))
            unique, duplicate_count = deduplicate_candidates(normalized)
            write_jsonl_atomic(path, unique)
            return duplicate_count

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "snapshot.jsonl"
            self.assertEqual(collect_snapshot(output), 0)
            first = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(collect_snapshot(output), 0)
            second = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(len(first), 2)
            self.assertEqual(
                [row["candidate_id"] for row in first],
                [row["candidate_id"] for row in second],
            )
            self.assertEqual(
                [row["values"] for row in first],
                [row["values"] for row in second],
            )


if __name__ == "__main__":
    unittest.main()
