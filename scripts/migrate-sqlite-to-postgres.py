#!/usr/bin/env python3
"""Idempotent SQLite → PostgreSQL recovery for ProFinderNow.

Preserves primary keys. Never drops, truncates, or overwrites existing rows.
Conflicts are reported, not silently swallowed.

Required:
  DATABASE_URL          postgres connection string (recovery branch only)
  CONFIRM_MIGRATE=preserve-ids   for actual writes
  SQLITE_PATH           default prisma/dev.db

Optional:
  DRY_RUN=1             report only, no writes

Refuses known production hosts and any host that is not the verified recovery host
unless ALLOW_HOST_OVERRIDE=1 is set (never use on production).
"""
import os
import sqlite3
import sys
from urllib.parse import urlparse

CONFIRM = os.environ.get("CONFIRM_MIGRATE")
DRY_RUN = os.environ.get("DRY_RUN") == "1"
SQLITE_PATH = os.environ.get("SQLITE_PATH", "prisma/dev.db")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

VERIFIED_RECOVERY_HOST = "ep-broad-bird-b4qa54ze-pooler.c-6.us-east-2.aws.neon.tech"
FORBIDDEN_HOST_FRAGMENTS = ("prod", "production")

if not DRY_RUN and CONFIRM != "preserve-ids":
    sys.exit("Refusing to migrate. Set CONFIRM_MIGRATE=preserve-ids or DRY_RUN=1.")
if not DATABASE_URL.startswith("postgres"):
    sys.exit("DATABASE_URL must be a PostgreSQL URL. Value not printed.")
if DATABASE_URL.startswith("file:"):
    sys.exit("Refusing file: target.")

host = urlparse(DATABASE_URL).hostname or ""
if any(f in host.lower() for f in FORBIDDEN_HOST_FRAGMENTS):
    sys.exit("Refusing host that looks like production. Value not printed.")
if host != VERIFIED_RECOVERY_HOST and os.environ.get("ALLOW_HOST_OVERRIDE") != "1":
    sys.exit(f"Host {host} is not the verified recovery host. Aborting.")

try:
    import psycopg
except ImportError:
    sys.exit("Install psycopg (pip install psycopg[binary]) before running. No rows changed.")

TABLES = [
    "University", "ResearchArea", "Topic", "Program", "Professor", "Scholarship",
    "Student", "Application", "SavedProfessor", "Subscription", "UsageCounter",
    "BillingEvent", "Publication", "ProfessorSource", "ProfessorResearchArea",
    "ProfessorTopic",
]

src = sqlite3.connect(f"file:{SQLITE_PATH}?mode=ro", uri=True)
src.row_factory = sqlite3.Row

print(f"Source: {SQLITE_PATH}")
print(f"Target host: {host}")
print(f"Mode: {'DRY-RUN' if DRY_RUN else 'WRITE'}")

dst = psycopg.connect(DATABASE_URL)
dst.autocommit = False
report = []

def get_pk_columns(cur, table):
    cur.execute("""
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = %s::regclass AND i.indisprimary
        ORDER BY array_position(i.indkey, a.attnum)
    """, (f'"{table}"',))
    return [r[0] for r in cur.fetchall()]

try:
    with dst.cursor() as cur:
        for table in TABLES:
            try:
                cols = [r[1] for r in src.execute(f'PRAGMA table_info("{table}")')]
                rows = list(src.execute(f'SELECT * FROM "{table}"'))
            except sqlite3.Error as e:
                print(f"{table}\tSKIPPED (source missing: {e})")
                continue

            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                )
            """, (table,))
            if not cur.fetchone()[0]:
                print(f"{table}\tSKIPPED (destination table missing)")
                continue

            pk_cols = get_pk_columns(cur, table)
            if not pk_cols:
                print(f"{table}\tWARNING: no primary key detected")
                pk_cols = [cols[0]] if cols else []

            # Bulk fetch existing PKs
            if pk_cols:
                pk_list = ", ".join(f'"{c}"' for c in pk_cols)
                cur.execute(f'SELECT {pk_list} FROM "{table}"')
                existing = {tuple(r) if len(pk_cols) > 1 else r[0] for r in cur.fetchall()}
            else:
                existing = set()

            inserted = 0
            conflicts = 0
            to_insert = []
            for row in rows:
                values = [row[c] for c in cols]
                if pk_cols:
                    key = tuple(row[c] for c in pk_cols) if len(pk_cols) > 1 else row[pk_cols[0]]
                    if key in existing:
                        conflicts += 1
                        continue
                to_insert.append(values)
                inserted += 1

            if not DRY_RUN and to_insert:
                placeholders = ", ".join(["%s"] * len(cols))
                collist = ", ".join(f'"{c}"' for c in cols)
                sql = f'INSERT INTO "{table}" ({collist}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
                cur.executemany(sql, to_insert)

            if not DRY_RUN:
                cur.execute(f'SELECT COUNT(*) FROM "{table}"')
                after = cur.fetchone()[0]
            else:
                after = f"(dry-run, would be {len(rows) - conflicts + len(existing)})"

            report.append((table, len(rows), after, inserted, conflicts))
            print(f"{table}\tsource={len(rows)}\texisting={len(existing)}\tproposed_inserts={inserted}\tconflicts={conflicts}")

    if DRY_RUN:
        dst.rollback()
        print("DRY-RUN complete — rolled back, no changes.")
    else:
        dst.commit()
        print("Committed.")
except Exception as e:
    dst.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    print("\n=== SUMMARY ===")
    print("table\tsource\tdest_after\tproposed_inserts\tconflicts")
    for table, before, after, inserted, conflicts in report:
        print(f"{table}\t{before}\t{after}\t{inserted}\t{conflicts}")
    src.close()
    dst.close()
