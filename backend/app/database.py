"""
SQLite database setup for CivicPulse AI.

SQLAlchemy talks to the database. FastAPI uses get_db() to open a
session for each request and close it when the request is done.
"""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent

# Read database URL from environment (e.g. Render PostgreSQL).
# Falls back to local SQLite database when not provided.
raw_database_url = os.environ.get("DATABASE_URL")

if raw_database_url and raw_database_url.strip():
    DATABASE_URL = raw_database_url.strip()

    # Render and Heroku provide postgres:// URLs, but SQLAlchemy 1.4+
    # and 2.0+ require postgresql:// or postgresql+psycopg2://.
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

    # Production PostgreSQL connection pool configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Test connection liveness before checkout
        pool_size=10,
        max_overflow=20,
    )
else:
    DATABASE_URL = f"sqlite:///{BASE_DIR / 'civicpulse.db'}"

    # check_same_thread=False is required for SQLite with multi-threaded FastAPI workers.
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class that all database models inherit from."""

    pass


def get_db():
    """Provide a database session to API routes, then close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
