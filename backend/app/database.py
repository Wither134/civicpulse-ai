"""
SQLite database setup for CivicPulse AI.

SQLAlchemy talks to the database. FastAPI uses get_db() to open a
session for each request and close it when the request is done.
"""

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Store the SQLite file next to the backend folder (not inside app/).
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'civicpulse.db'}"

# check_same_thread=False is required because FastAPI can use the
# connection from more than one thread.
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
