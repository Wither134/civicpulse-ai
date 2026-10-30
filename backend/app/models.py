"""
Database tables (SQLAlchemy models).

A "model" is a Python class that maps to one database table.
AI fields are stored here so the later intelligence engine can fill
them in. This backend does not generate AI analysis yet.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    """Return the current time in UTC (timezone-aware)."""
    return datetime.now(timezone.utc)


class Report(Base):
    """One civic complaint submitted by a resident."""

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Public tracking code, for example CP-A1B2C3. Shown to citizens.
    report_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Scoring fields. Left empty until the AI engine is added.
    priority: Mapped[str | None] = mapped_column(String(50), nullable=True)
    urgency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    impact: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional link to an earlier report if this one is a duplicate.
    duplicate_of: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("reports.id"), nullable=True
    )

    status: Mapped[str] = mapped_column(String(50), default="submitted")
    assigned_department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
