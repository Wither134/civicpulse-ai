"""
Complaint (report) API routes with integrated Local Incident Intelligence Engine.

Provides complaint submission, operational dispatch, duplicate triage,
DBSCAN hotspot detection, and explainable priority scoring.
Runs entirely offline using local scikit-learn models and rule-based heuristics.
"""

import json
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Report, utc_now
from app.ml.hotspots import detect_hotspots
from app.ml.pipeline import apply_analysis_to_report, run_incident_intelligence
from app.schemas import (
    BatchAnalysisOut,
    HotspotOut,
    ReportCreate,
    ReportOut,
    ReportStatusUpdate,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


def generate_report_code() -> str:
    """Create a short public tracking code, for example CP-7K9Q2M."""
    alphabet = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"CP-{suffix}"


def get_report_by_code(db: Session, report_code: str) -> Report:
    """Load a report by its public code, or return HTTP 404."""
    report = db.query(Report).filter(Report.report_code == report_code).first()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No report found with code {report_code}",
        )
    return report


@router.post("/", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_report(payload: ReportCreate, db: Session = Depends(get_db)):
    """Submit a new civic complaint and run local incident intelligence."""
    # Retry if the random code collides (very unlikely).
    report_code = generate_report_code()
    while db.query(Report).filter(Report.report_code == report_code).first():
        report_code = generate_report_code()

    # Load existing reports for duplicate detection and context
    existing_reports = db.query(Report).all()

    report = Report(
        report_code=report_code,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        location=payload.location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="submitted",
    )

    # Run Local Incident Intelligence Engine
    try:
        analysis = run_incident_intelligence(
            title=payload.title,
            description=payload.description,
            category=payload.category,
            location=payload.location,
            latitude=payload.latitude,
            longitude=payload.longitude,
            existing_reports=existing_reports,
        )
        apply_analysis_to_report(report, analysis)
    except Exception:
        # Failsafe: Complaint is always persisted even if local ML hits an edge case
        pass

    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db)):
    """List all complaints, newest first."""
    return db.query(Report).order_by(Report.created_at.desc()).all()


# Static route: declared before /{report_code}
@router.get("/hotspots", response_model=list[HotspotOut])
def get_hotspots(db: Session = Depends(get_db)):
    """
    Detect geographic problem hotspots using scikit-learn DBSCAN clustering.
    Returns cluster centroids, radius, report counts, and dominant categories.
    """
    reports = db.query(Report).all()
    clusters = detect_hotspots(reports, eps_meters=650.0, min_samples=2)

    return [
        HotspotOut(
            cluster_id=c.cluster_id,
            centroid_lat=c.centroid_lat,
            centroid_lng=c.centroid_lng,
            radius_meters=c.radius_meters,
            report_count=c.report_count,
            dominant_category=c.dominant_category,
            category_breakdown=c.category_breakdown,
            report_codes=c.report_codes,
            report_ids=c.report_ids,
            highest_priority=c.highest_priority,
            description=c.description,
        )
        for c in clusters
    ]


# Static route: declared before /{report_code}
@router.post("/analyze-all", response_model=BatchAnalysisOut)
def analyze_all_reports(db: Session = Depends(get_db)):
    """
    Run local intelligence across all complaints in the database.
    Useful for back-populating AI fields on existing historical records.
    """
    reports = db.query(Report).all()
    count = 0

    for report in reports:
        try:
            analysis = run_incident_intelligence(
                title=report.title,
                description=report.description,
                category=report.category,
                location=report.location,
                latitude=report.latitude,
                longitude=report.longitude,
                existing_reports=reports,
                target_report_id=report.id,
            )
            apply_analysis_to_report(report, analysis)
            count += 1
        except Exception:
            continue

    db.commit()
    return BatchAnalysisOut(
        analyzed_count=count,
        message=f"Successfully analyzed {count} complaints using local Python ML models.",
    )


@router.get("/{report_code}", response_model=ReportOut)
def track_report(report_code: str, db: Session = Depends(get_db)):
    """Look up one complaint by its tracking code."""
    return get_report_by_code(db, report_code)


@router.post("/{report_code}/analyze", response_model=ReportOut)
def analyze_single_report(report_code: str, db: Session = Depends(get_db)):
    """
    Re-run the local incident intelligence pipeline on a specific complaint.
    Refreshes priority scoring, classification, extractive summary, and duplicate status.
    """
    report = get_report_by_code(db, report_code)
    existing_reports = db.query(Report).all()

    analysis = run_incident_intelligence(
        title=report.title,
        description=report.description,
        category=report.category,
        location=report.location,
        latitude=report.latitude,
        longitude=report.longitude,
        existing_reports=existing_reports,
        target_report_id=report.id,
    )
    apply_analysis_to_report(report, analysis)
    report.updated_at = utc_now()
    db.commit()
    db.refresh(report)
    return report


@router.post("/{report_code}/unlink-duplicate", response_model=ReportOut)
def unlink_duplicate(report_code: str, db: Session = Depends(get_db)):
    """Authority action: unlink a complaint previously flagged as duplicate."""
    report = get_report_by_code(db, report_code)
    report.duplicate_of = None

    # Update explanation payload if JSON
    if report.ai_explanation:
        try:
            data = json.loads(report.ai_explanation)
            if isinstance(data, dict):
                data["is_duplicate"] = False
                data["duplicate_of_id"] = None
                data["duplicate_of_code"] = None
                data["duplicate_rationale"] = "Duplicate flag was reviewed and unlinked by authority."
                report.ai_explanation = json.dumps(data)
        except Exception:
            pass

    report.updated_at = utc_now()
    db.commit()
    db.refresh(report)
    return report


@router.post("/{report_code}/confirm-duplicate", response_model=ReportOut)
def confirm_duplicate(
    report_code: str, master_code: str, db: Session = Depends(get_db)
):
    """Authority action: confirm and manually link a duplicate to a master report code."""
    report = get_report_by_code(db, report_code)
    master = get_report_by_code(db, master_code)

    report.duplicate_of = master.id

    if report.ai_explanation:
        try:
            data = json.loads(report.ai_explanation)
            if isinstance(data, dict):
                data["is_duplicate"] = True
                data["duplicate_of_id"] = master.id
                data["duplicate_of_code"] = master.report_code
                data["duplicate_rationale"] = f"Confirmed as duplicate of {master.report_code} by authority."
                report.ai_explanation = json.dumps(data)
        except Exception:
            pass

    report.updated_at = utc_now()
    db.commit()
    db.refresh(report)
    return report


@router.patch("/{report_code}/status", response_model=ReportOut)
def update_report_status(
    report_code: str,
    payload: ReportStatusUpdate,
    db: Session = Depends(get_db),
):
    """Update status, assigned department, and/or resolution note."""
    report = get_report_by_code(db, report_code)

    if payload.status is not None:
        report.status = payload.status
    if payload.assigned_department is not None:
        report.assigned_department = payload.assigned_department
    if payload.resolution_note is not None:
        report.resolution_note = payload.resolution_note
    if payload.priority is not None:
        report.priority = payload.priority
    if payload.category is not None:
        report.category = payload.category

    report.updated_at = utc_now()
    db.commit()
    db.refresh(report)
    return report
