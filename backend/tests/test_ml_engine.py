"""
Unit tests for CivicPulse AI Local Machine Learning & Intelligence Engine.
"""

import sys
import os
import unittest
from pathlib import Path

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.ml.classifier import get_classifier
from app.ml.duplicate_detector import get_duplicate_detector
from app.ml.scorer import calculate_priority_score
from app.ml.summarizer import generate_extractive_summary
from app.ml.hotspots import detect_hotspots
from app.ml.pipeline import run_incident_intelligence


class MockReport:
    """Mock report object for unit testing."""
    def __init__(self, id, report_code, title, description, category, latitude=None, longitude=None, status="submitted", priority=None, duplicate_of=None):
        self.id = id
        self.report_code = report_code
        self.title = title
        self.description = description
        self.category = category
        self.latitude = latitude
        self.longitude = longitude
        self.status = status
        self.priority = priority
        self.duplicate_of = duplicate_of


class TestClassifier(unittest.TestCase):
    def setUp(self):
        self.classifier = get_classifier()

    def test_pothole_classification(self):
        res = self.classifier.classify("Deep pothole on main road", "Asphalt broken and damaging vehicles")
        self.assertEqual(res.predicted_category, "Roads & potholes")
        self.assertGreater(res.confidence, 0.5)

    def test_streetlight_classification(self):
        res = self.classifier.classify("Dark street corner", "The street light lamp post is broken and flickering")
        self.assertEqual(res.predicted_category, "Street lighting")
        self.assertGreater(res.confidence, 0.5)

    def test_drainage_waterlogging_classification(self):
        res = self.classifier.classify("Severe waterlogging", "Rainwater flooded the road and storm drain is blocked")
        self.assertEqual(res.predicted_category, "Drainage & flooding")

    def test_garbage_classification(self):
        res = self.classifier.classify("Trash not collected", "Huge garbage pile dumped on sidewalk creating foul smell")
        self.assertEqual(res.predicted_category, "Waste collection")

    def test_fallback_on_unclear_text(self):
        res = self.classifier.classify("Something is wrong", "Please look into it", citizen_category="Other")
        self.assertEqual(res.predicted_category, "Other")
        self.assertLessEqual(res.confidence, 0.5)


class TestDuplicateDetector(unittest.TestCase):
    def setUp(self):
        self.detector = get_duplicate_detector()
        self.existing = [
            MockReport(1, "CP-111111", "Severe waterlogging near main road", "Storm drain overflowing with heavy rainwater", "Drainage & flooding", 12.9756, 77.6067),
            MockReport(2, "CP-222222", "Broken streetlight pole", "Light fixture fused and dark", "Street lighting", 12.9800, 77.6100),
        ]

    def test_duplicate_match_with_close_coords(self):
        # Similar text and same location (within 50 meters)
        match = self.detector.find_duplicate(
            target_title="Severe waterlogging near main road",
            target_description="Waterlogged street because drain is blocked",
            target_lat=12.9757,
            target_lng=77.6068,
            existing_reports=self.existing,
        )
        self.assertTrue(match.is_likely_duplicate)
        self.assertEqual(match.original_report_code, "CP-111111")
        self.assertGreaterEqual(match.similarity_score, 0.65)
        self.assertIsNotNone(match.distance_meters)
        self.assertLess(match.distance_meters, 100.0)

    def test_different_issue_not_duplicate(self):
        match = self.detector.find_duplicate(
            target_title="Garbage pile uncollected",
            target_description="Sanitation truck missed our street for three days",
            target_lat=12.9756,
            target_lng=77.6067,
            existing_reports=self.existing,
        )
        self.assertFalse(match.is_likely_duplicate)
        self.assertLess(match.similarity_score, 0.65)

    def test_graceful_missing_coordinates(self):
        # Works without coordinates using text similarity
        match = self.detector.find_duplicate(
            target_title="Severe waterlogging near main road",
            target_description="Heavy rainwater overflowing onto street",
            target_lat=None,
            target_lng=None,
            existing_reports=self.existing,
        )
        self.assertTrue(match.is_likely_duplicate)
        self.assertIsNone(match.distance_meters)


class TestPriorityScorer(unittest.TestCase):
    def test_formula_and_ranges(self):
        existing = [
            MockReport(1, "CP-A", "Pothole", "A road issue", "Roads & potholes"),
            MockReport(2, "CP-B", "Pothole", "Another pothole", "Roads & potholes"),
        ]
        breakdown = calculate_priority_score(
            title="Severe live wire hazard on highway junction",
            description="High voltage wire collapsed on main road during storm posing imminent danger",
            category="Electrical",
            location="MG Road Main Junction",
            all_reports=existing,
            duplicate_count=1,
            is_duplicate=True,
        )
        self.assertEqual(breakdown.priority_level, "Critical")
        self.assertGreaterEqual(breakdown.priority_score, 75.0)
        self.assertLessEqual(breakdown.priority_score, 100.0)
        # Check formula structure
        expected_score = round(
            (0.35 * breakdown.urgency) + (0.30 * breakdown.impact) + (0.20 * breakdown.recurrence) + (0.15 * breakdown.frequency),
            1
        )
        self.assertEqual(breakdown.priority_score, expected_score)

    def test_routine_issue_scores_low_or_medium(self):
        existing = []
        breakdown = calculate_priority_score(
            title="Faded lane marking in residential lane",
            description="The white paint on the street is slightly worn out",
            category="Roads & potholes",
            location="5th Cross Residential Alley",
            all_reports=existing,
            duplicate_count=0,
            is_duplicate=False,
        )
        self.assertIn(breakdown.priority_level, ["Low", "Medium"])
        self.assertLess(breakdown.priority_score, 50.0)


class TestSummarizer(unittest.TestCase):
    def test_extractive_summary(self):
        desc = (
            "A deep pothole has formed right outside the school gate on 4th Main Road. "
            "Several cyclists have slipped and fallen during morning rush hour. "
            "Please send an inspection team to patch this dangerous hole immediately."
        )
        summary = generate_extractive_summary("Dangerous pothole near school gate", desc, max_sentences=1)
        self.assertIn("pothole", summary.lower())
        self.assertTrue(summary.endswith("."))
        # Must be an exact substring from the description (zero hallucination)
        clean_sentence = summary.rstrip(".")
        self.assertTrue(clean_sentence in desc)


class TestHotspots(unittest.TestCase):
    def test_dbscan_clustering(self):
        # 3 reports tightly clustered near 12.9750, 77.6060 and 1 far away
        clustered_reports = [
            MockReport(1, "CP-01", "Waterlogging 1", "Flooding", "Drainage & flooding", 12.9750, 77.6060),
            MockReport(2, "CP-02", "Waterlogging 2", "Flooding", "Drainage & flooding", 12.9752, 77.6062),
            MockReport(3, "CP-03", "Blocked Drain", "Sewage", "Drainage & flooding", 12.9754, 77.6061),
            MockReport(4, "CP-04", "Far streetlight", "Dark", "Street lighting", 13.0500, 77.5000),  # > 15 km away
        ]
        hotspots = detect_hotspots(clustered_reports, eps_meters=600.0, min_samples=2)
        self.assertEqual(len(hotspots), 1)
        self.assertEqual(hotspots[0].report_count, 3)
        self.assertEqual(hotspots[0].dominant_category, "Drainage & flooding")
        self.assertAlmostEqual(hotspots[0].centroid_lat, 12.9752, places=3)

    def test_empty_or_small_data(self):
        # Graceful handling of < 2 coordinates
        self.assertEqual(detect_hotspots([]), [])
        self.assertEqual(detect_hotspots([MockReport(1, "A", "T", "D", "C", None, None)]), [])


class TestPipeline(unittest.TestCase):
    def test_full_pipeline_run(self):
        existing = [MockReport(1, "CP-01", "Old drain issue", "Drain problem", "Drainage & flooding")]
        result = run_incident_intelligence(
            title="Severe waterlogging on main road",
            description="Drain overflowing onto sidewalk. Water is stagnating knee-deep.",
            category="Drainage & flooding",
            location="Main Road",
            latitude=12.9756,
            longitude=77.6067,
            existing_reports=existing,
        )
        self.assertIn(result.priority_level, ["Critical", "High"])
        self.assertGreater(result.urgency, 50)
        self.assertTrue(len(result.recommended_actions) >= 2)
        self.assertIsNotNone(result.extractive_summary)


if __name__ == "__main__":
    unittest.main()
