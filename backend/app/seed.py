"""
CivicPulse AI — Baseline Seed Script.

Populates the 7 baseline municipal demonstration reports if the SQLite
database is brand new or empty. Safe to run multiple times (idempotent).
"""

from app.database import Base, SessionLocal, engine
from app.models import Report

SEED_REPORTS = [
    {
        "report_code": "CP-PQXWMO",
        "title": "Broken streetlight on Main St",
        "description": "The light near the park has been out for three nights.",
        "category": "Street lighting",
        "location": "Main Street & Park Ave",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "priority": "Medium",
        "urgency": 40,
        "impact": 58,
        "status": "in_progress",
        "assigned_department": "Public Works",
        "resolution_note": "Crew scheduled for tonight.",
    },
    {
        "report_code": "CP-NKAQ51",
        "title": "Severe waterlogging near main road",
        "description": "Heavy water accumulation is blocking traffic and making it difficult for pedestrians to cross.",
        "category": "Drainage & flooding",
        "location": "MG Road, Bengaluru",
        "latitude": 12.9756,
        "longitude": 77.6067,
        "priority": "High",
        "urgency": 87,
        "impact": 35,
        "status": "submitted",
        "assigned_department": None,
        "resolution_note": None,
    },
    {
        "report_code": "CP-PROGCR",
        "title": "Severe waterlogging near main road",
        "description": "Heavy water accumulation is blocking traffic and making it difficult for pedestrians to cross.",
        "category": "Drainage & flooding",
        "location": "MG Road, Bengaluru",
        "latitude": 12.9756,
        "longitude": 77.6067,
        "priority": "High",
        "urgency": 87,
        "impact": 35,
        "status": "submitted",
        "assigned_department": None,
        "resolution_note": None,
    },
    {
        "report_code": "CP-R6Q10A",
        "title": "Severe waterlogging near main road",
        "description": "Heavy water accumulation is blocking traffic and making it difficult for pedestrians to cross.",
        "category": "Drainage & flooding",
        "location": "MG Road, Bengaluru",
        "latitude": 12.9756,
        "longitude": 77.6067,
        "priority": "High",
        "urgency": 87,
        "impact": 35,
        "status": "submitted",
        "assigned_department": None,
        "resolution_note": None,
    },
    {
        "report_code": "CP-0E1MJ0",
        "title": "Severe waterlogging near main road",
        "description": "Heavy water accumulation is blocking traffic and making it difficult for pedestrians to cross.",
        "category": "Drainage & flooding",
        "location": "MG Road, Bengaluru",
        "latitude": 12.9756,
        "longitude": 77.6067,
        "priority": "High",
        "urgency": 87,
        "impact": 35,
        "status": "submitted",
        "assigned_department": None,
        "resolution_note": None,
    },
    {
        "report_code": "CP-Y74BB9",
        "title": "Blocked drain overflowing onto sidewalk",
        "description": "Rainwater is pooling because the roadside drain is clogged with debris. Pedestrians are forced onto the street.",
        "category": "Drainage & flooding",
        "location": "Church Street, Bengaluru",
        "latitude": 12.9741,
        "longitude": 77.6090,
        "priority": "High",
        "urgency": 76,
        "impact": 58,
        "status": "submitted",
        "assigned_department": None,
        "resolution_note": None,
    },
    {
        "report_code": "CP-STECNO",
        "title": "Pothole on access road",
        "description": "A deep pothole on the asphalt surface causing vehicle damage.",
        "category": "Roads & potholes",
        "location": "Mangalore Access Road",
        "latitude": 12.9141,
        "longitude": 74.8560,
        "priority": "Medium",
        "urgency": 40,
        "impact": 35,
        "status": "resolved",
        "assigned_department": "Roads & Infrastructure",
        "resolution_note": "Pothole patched and surface leveled. Road cleared for traffic.",
    },
]


def seed_database():
    """Ensure tables exist and seed demo records if database has no reports."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Report).count()
        if count == 0:
            print("Database is empty. Seeding 7 demonstration reports...")
            for data in SEED_REPORTS:
                rep = Report(**data)
                db.add(rep)
            db.commit()
            print("Successfully seeded 7 demo records.")
        else:
            print(f"Database already contains {count} reports. Seed skipped.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
