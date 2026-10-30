"""
Safe, idempotent SQLite to PostgreSQL migration script for CivicPulse AI.

Transfers existing reports from local SQLite (civicpulse.db) into Render PostgreSQL
without modifying or deleting the local database, and without creating duplicate records.

Usage:
    # Option 1: Pass target database URL via environment variable
    export TARGET_DATABASE_URL="postgresql://user:pass@host/civicpulse-db?sslmode=require"
    python -m app.migrate_to_postgres

    # Option 2: Pass as CLI argument
    python -m app.migrate_to_postgres --target-url "postgresql://user:pass@host/civicpulse-db?sslmode=require"

    # Option 3: Dry-run without writing to PostgreSQL
    python -m app.migrate_to_postgres --dry-run
"""

import argparse
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Report


def parse_datetime(val: str | None) -> datetime | None:
    """Parse ISO datetime string from SQLite into a timezone-aware datetime."""
    if not val:
        return None
    try:
        # SQLite stores strings like '2026-10-30 08:52:12.123456' or ISO format
        clean = val.replace(" ", "T")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def migrate(target_url: str | None = None, dry_run: bool = False):
    base_dir = Path(__file__).resolve().parent.parent
    sqlite_path = base_dir / "civicpulse.db"

    if not sqlite_path.exists():
        print(f"Error: SQLite database not found at {sqlite_path}", file=sys.stderr)
        sys.exit(1)

    # 1. Resolve PostgreSQL connection URL
    pg_url = target_url or os.environ.get("TARGET_DATABASE_URL") or os.environ.get("DATABASE_URL")

    if not pg_url and not dry_run:
        print(
            "Error: No target PostgreSQL URL provided.\n"
            "Provide it via --target-url or set TARGET_DATABASE_URL environment variable.\n"
            "Example: python -m app.migrate_to_postgres --target-url 'postgresql://...'",
            file=sys.stderr,
        )
        sys.exit(1)

    # 2. Read SQLite reports (Read-Only)
    print(f"Connecting to source SQLite database at: {sqlite_path}")
    sqlite_conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    cur = sqlite_conn.cursor()

    cur.execute(
        """
        SELECT 
            id, report_code, title, description, category, location,
            latitude, longitude, priority, urgency, impact, ai_summary,
            ai_explanation, duplicate_of, status, assigned_department,
            resolution_note, created_at, updated_at
        FROM reports
        ORDER BY id ASC
        """
    )
    sqlite_rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    sqlite_conn.close()

    total_source = len(sqlite_rows)
    print(f"Found {total_source} existing report(s) in local SQLite.")

    if dry_run:
        print("\n--- DRY-RUN MODE: No changes will be made to PostgreSQL ---")
        for r in sqlite_rows:
            data = dict(zip(cols, r))
            print(f"  [Dry-run] Would migrate Report ID {data['id']}: {data['report_code']} - {data['title'][:40]}")
        print(f"\nDry-run complete: {total_source} records verified for migration.")
        return

    # 3. Clean and connect to PostgreSQL
    clean_pg_url = pg_url.strip()
    if clean_pg_url.startswith("postgres://"):
        clean_pg_url = clean_pg_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif clean_pg_url.startswith("postgresql://") and not clean_pg_url.startswith("postgresql+"):
        clean_pg_url = clean_pg_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    print("Connecting to target PostgreSQL database...")
    pg_engine = create_engine(clean_pg_url, pool_pre_ping=True)

    # Ensure schema exists on PostgreSQL
    Base.metadata.create_all(bind=pg_engine)
    PgSession = sessionmaker(bind=pg_engine)
    pg_db = PgSession()

    migrated_count = 0
    skipped_count = 0

    try:
        # 4. Migrate rows idempotently
        for r in sqlite_rows:
            data = dict(zip(cols, r))
            rep_id = data["id"]
            rep_code = data["report_code"]

            # Check if record already exists by report_code or id
            existing = (
                pg_db.query(Report)
                .filter((Report.report_code == rep_code) | (Report.id == rep_id))
                .first()
            )

            if existing:
                print(f"  Report {rep_code} (ID: {rep_id}) already exists in PostgreSQL — skipping.")
                skipped_count += 1
                continue

            # Create Report object preserving all fields
            new_report = Report(
                id=rep_id,
                report_code=rep_code,
                title=data["title"],
                description=data["description"],
                category=data["category"],
                location=data["location"],
                latitude=data["latitude"],
                longitude=data["longitude"],
                priority=data["priority"],
                urgency=data["urgency"],
                impact=data["impact"],
                ai_summary=data["ai_summary"],
                ai_explanation=data["ai_explanation"],
                duplicate_of=data["duplicate_of"],
                status=data["status"],
                assigned_department=data["assigned_department"],
                resolution_note=data["resolution_note"],
                created_at=parse_datetime(data["created_at"]),
                updated_at=parse_datetime(data["updated_at"]),
            )
            pg_db.add(new_report)
            migrated_count += 1

        pg_db.commit()

        # 5. Synchronize PostgreSQL primary key sequence
        # Important: When explicit IDs are inserted, PostgreSQL's sequence must be advanced
        # to the maximum ID so new inserts don't collide.
        try:
            pg_db.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('reports', 'id'), COALESCE(MAX(id), 1)) FROM reports;"
                )
            )
            pg_db.commit()
            print("PostgreSQL primary key auto-increment sequence successfully synchronized.")
        except Exception as seq_err:
            print(f"Note on sequence sync: {seq_err}")

        total_pg = pg_db.query(Report).count()
        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print(f"Source records in SQLite : {total_source}")
        print(f"Newly migrated records   : {migrated_count}")
        print(f"Already existing/skipped : {skipped_count}")
        print(f"Total records in Postgre : {total_pg}")
        print("Local SQLite database remains 100% intact and unmodified.")
        print("=" * 60)

    except Exception as e:
        pg_db.rollback()
        print(f"\nError during migration: {e}", file=sys.stderr)
        raise
    finally:
        pg_db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate CivicPulse AI reports from SQLite to PostgreSQL.")
    parser.add_argument("--target-url", help="Target PostgreSQL connection URL (or set TARGET_DATABASE_URL env var)")
    parser.add_argument("--dry-run", action="store_true", help="Preview migration without modifying PostgreSQL")
    args = parser.parse_args()

    migrate(target_url=args.target_url, dry_run=args.dry_run)
