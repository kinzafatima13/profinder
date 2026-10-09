#!/usr/bin/env python3
"""Copy the committed SQLite catalog into PostgreSQL without deleting source rows.

Does not run unless CONFIRM_MIGRATE=preserve-ids.
Does not delete, reset, or overwrite prisma/dev.db.
Preserves primary keys. Skips rows that already exist.
Requires DATABASE_URL (postgres) and SQLITE_PATH.
"""
import os
import sqlite3
import sys

CONFIRM = os.environ.get("CONFIRM_MIGRATE")
SQLITE_PATH = os.environ.get("SQLITE_PATH", "prisma/dev.db")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

if CONFIRM != "preserve-ids":
    sys.exit("Refusing to migrate. Set CONFIRM_MIGRATE=preserve-ids after a verified backup.")
if not DATABASE_URL.startswith("postgres"):
    sys.exit("DATABASE_URL must be a PostgreSQL URL. Not printing the value.")
if DATABASE_URL.startswith("file:"):
    sys.exit("Refusing file: target.")

try:
    import psycopg
except ImportError:
    sys.exit("Install psycopg before running this script. No rows were changed.")

# Tables present in the SQLite backup, in dependency order.
TABLES = [
    "University",
    "ResearchArea",
    "Topic",
    "Program",
    "Professor",
    "Scholarship",
    "Student",
    "Application",
    "SavedProfessor",
    "Subscription",
    "UsageCounter",
    "BillingEvent",
    "Publication",
    "ProfessorSource",
    "ProfessorResearchArea",
    "ProfessorTopic",
]

src = sqlite3.connect(SQLITE_PATH)
src.row_factory = sqlite3.Row
dst = psycopg.connect(DATABASE_URL)
dst.autocommit = False
report = []
try:
    with dst.cursor() as cur:
        for table in TABLES:
            cols = [r[1] for r in src.execute(f'PRAGMA table_info("{table}")')]
            rows = list(src.execute(f'SELECT * FROM "{table}"'))
            inserted = 0
            for row in rows:
                values = [row[c] for c in cols]
                placeholders = ", ".join(["%s"] * len(cols))
                collist = ", ".join(f'"{c}"' for c in cols)
                sql = f'INSERT INTO "{table}" ({collist}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
                cur.execute(sql, values)
                inserted += cur.rowcount
            cur.execute(f'SELECT COUNT(*) FROM "{table}"')
            report.append((table, len(rows), cur.fetchone()[0], inserted))
    dst.commit()
except Exception:
    dst.rollback()
    raise
finally:
    for table, before, after, inserted in report:
        print(f"{table}\tsqlite={before}\tpostgres={after}\tinserted={inserted}")
