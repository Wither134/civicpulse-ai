"""
Pydantic schemas = the shape of JSON sent to and from the API.

These are not database tables. They validate request bodies and
control what is returned in responses.
"""

from datetime import datetime
import json
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field


class ReportCreate(BaseModel):
    """JSON body for submitting a new complaint."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: str | None = None
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class ReportStatusUpdate(BaseModel):
    """JSON body for updating status, assignment, resolution note, priority, or category."""

    status: str | None = None
    assigned_department: str | None = None
    resolution_note: str | None = None
    priority: str | None = None
    category: str | None = None


class AIAnalysisOut(BaseModel):
    """Structured breakdown of local incident intelligence analysis."""

    predicted_category: str
    category_confidence: float
    category_method: str
    is_category_agreement: bool
    priority_level: str
    priority_score: float
    urgency: int
    impact: int
    recurrence: int
    frequency: int
    formula: str
    explanation: str
    factor_reasons: list[str]
    extractive_summary: str
    recommended_actions: list[str]
    is_duplicate: bool
    duplicate_of_id: Optional[int] = None
    duplicate_of_code: Optional[str] = None
    duplicate_similarity: float = 0.0
    duplicate_distance_meters: Optional[float] = None
    duplicate_rationale: str = ""


class HotspotOut(BaseModel):
    """Geographic problem hotspot detected via local DBSCAN clustering."""

    cluster_id: int
    centroid_lat: float
    centroid_lng: float
    radius_meters: float
    report_count: int
    dominant_category: str
    category_breakdown: dict[str, int]
    report_codes: list[str]
    report_ids: list[int]
    highest_priority: str
    description: str


class BatchAnalysisOut(BaseModel):
    """Result of running local batch intelligence on multiple complaints."""

    analyzed_count: int
    message: str


class ReportOut(BaseModel):
    """JSON returned for a saved report."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    report_code: str
    title: str
    description: str
    category: str | None
    location: str | None
    latitude: float | None
    longitude: float | None
    priority: str | None
    urgency: int | None
    impact: int | None
    ai_summary: str | None
    ai_explanation: str | None
    duplicate_of: int | None
    status: str
    assigned_department: str | None
    resolution_note: str | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def ai_analysis(self) -> Optional[AIAnalysisOut]:
        """Compute structured AI analysis object from ai_explanation if JSON encoded."""
        if not self.ai_explanation:
            return None
        try:
            data = json.loads(self.ai_explanation)
            if isinstance(data, dict) and "priority_score" in data:
                return AIAnalysisOut(
                    predicted_category=data.get("predicted_category", self.category or "Other"),
                    category_confidence=float(data.get("category_confidence", 0.70)),
                    category_method=data.get("category_method", "local_ml"),
                    is_category_agreement=data.get("is_category_agreement", True),
                    priority_level=data.get("priority_level", self.priority or "Medium"),
                    priority_score=float(data.get("priority_score", 50.0)),
                    urgency=int(data.get("urgency", self.urgency or 50)),
                    impact=int(data.get("impact", self.impact or 50)),
                    recurrence=int(data.get("recurrence", 20)),
                    frequency=int(data.get("frequency", 20)),
                    formula=data.get("formula", ""),
                    explanation=data.get("narrative", self.ai_explanation),
                    factor_reasons=data.get("factor_reasons", []),
                    extractive_summary=self.ai_summary or "",
                    recommended_actions=data.get("recommended_actions", []),
                    is_duplicate=bool(data.get("is_duplicate", False)),
                    duplicate_of_id=data.get("duplicate_of_id", self.duplicate_of),
                    duplicate_of_code=data.get("duplicate_of_code"),
                    duplicate_similarity=float(data.get("duplicate_similarity", 0.0)),
                    duplicate_distance_meters=data.get("duplicate_distance_meters"),
                    duplicate_rationale=data.get("duplicate_rationale", ""),
                )
        except Exception:
            return None
        return None
