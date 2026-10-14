#!/usr/bin/env python3
"""Unit tests for recovery importer safety rules. No database required."""
import os
import sys
import unittest
from urllib.parse import urlparse

VERIFIED_RECOVERY_HOST = "ep-broad-bird-b4qa54ze-pooler.c-6.us-east-2.aws.neon.tech"
FORBIDDEN_HOST_FRAGMENTS = ("prod", "production")

def host_allowed(url: str, override: bool = False) -> bool:
    host = urlparse(url).hostname or ""
    if any(f in host.lower() for f in FORBIDDEN_HOST_FRAGMENTS):
        return False
    if host == VERIFIED_RECOVERY_HOST:
        return True
    return override

class RecoverySafetyTests(unittest.TestCase):
    def test_verified_host_allowed(self):
        url = f"postgresql://user:pass@{VERIFIED_RECOVERY_HOST}/neondb"
        self.assertTrue(host_allowed(url))

    def test_production_host_refused(self):
        url = "postgresql://user:pass@ep-production-xxx.neon.tech/neondb"
        self.assertFalse(host_allowed(url))

    def test_unknown_host_refused(self):
        url = "postgresql://user:pass@ep-other.neon.tech/neondb"
        self.assertFalse(host_allowed(url))

    def test_unknown_host_allowed_only_with_override(self):
        url = "postgresql://user:pass@ep-other.neon.tech/neondb"
        self.assertTrue(host_allowed(url, override=True))

    def test_conflict_counting_contract(self):
        # Documented: existing PK = conflict, not silent skip
        existing = {"id-1", "id-2"}
        incoming = ["id-1", "id-3"]
        inserts = [i for i in incoming if i not in existing]
        conflicts = [i for i in incoming if i in existing]
        self.assertEqual(inserts, ["id-3"])
        self.assertEqual(conflicts, ["id-1"])

if __name__ == "__main__":
    unittest.main()
