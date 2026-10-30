# CivicPulse AI — Municipal Incident Intelligence & Operations Command Center

CivicPulse AI is a modern municipal operations platform and explainable local incident intelligence engine. It empowers civic authorities to ingest, analyze, prioritize, and dispatch citizen complaints using 100% local, offline Python machine learning algorithms.

---

## Key Highlights

- **Municipal Operations Command Center**: Inspired by modern emergency dispatch consoles (Fixly dashboard design), featuring real-time KPI metrics, triage alerts, high-priority queues, and recent incident registers.
- **Interactive GIS Map**: Real-time Leaflet map displaying live complaint coordinates with custom status markers and density rings.
- **DBSCAN Geographic Hotspots**: Identifies geographic problem concentrations using scikit-learn Density-Based Spatial Clustering of Applications with Noise (`eps=650m`, Haversine metric).
- **Duplicate Detection**: Uses TF-IDF cosine similarity combined with Haversine spatial proximity (<150m boost, >3km penalty) to detect likely duplicate complaints without deleting or merging them.
- **Explainable Priority Scoring**: Transparent heuristic formula:
  $$\text{Priority Score} = (0.35 \times \text{Urgency}) + (0.30 \times \text{Impact}) + (0.20 \times \text{Recurrence}) + (0.15 \times \text{Frequency})$$
  Categorized into Critical (75–100), High (50–74), Medium (25–49), and Low (0–24).
- **Extractive Complaint Summaries**: Zero-hallucination local sentence-salience extraction highlighting factual clauses without generative AI.
- **Rule-Based SOP Recommendations**: Maps complaint domains to actionable municipal standard operating procedures with one-click copy to notes.
- **Dispatcher Workflow Drawer**: Flyout slide-over drawer enabling dispatchers to update statuses (`submitted`, `under_review`, `in_progress`, `resolved`), assign municipal departments, and record resolution notes.
- **Zero Cloud Costs & 100% Data Privacy**: Built with Python, scikit-learn, and SQLite. Zero paid APIs, zero external telemetry, zero OpenAI/Gemini tokens.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, React-Leaflet, Lucide Icons, Recharts, Vanilla CSS Design System.
- **Backend**: Python 3.12, FastAPI, SQLite, SQLAlchemy, Pydantic v2.
- **Local Machine Learning**: scikit-learn (TF-IDF vectorizer, Multinomial Naive Bayes, DBSCAN), NumPy, SciPy.

---

## Repository Structure

```
civicpulse-ai/
├── backend/
│   ├── app/
│   │   ├── ml/                 # Local ML modules
│   │   │   ├── classifier.py       # TF-IDF + Naive Bayes + Keyword fallback
│   │   │   ├── duplicate_detector.py # TF-IDF Cosine Similarity + Haversine distance
│   │   │   ├── scorer.py           # Transparent priority scoring heuristic
│   │   │   ├── summarizer.py       # Zero-hallucination extractive summarizer
│   │   │   ├── recommender.py      # Rule-based SOP recommendations
│   │   │   ├── hotspots.py         # DBSCAN spatial clustering
│   │   │   └── pipeline.py         # Orchestration pipeline
│   │   ├── routers/
│   │   │   └── reports.py          # REST endpoints
│   │   ├── database.py         # SQLite connection
│   │   ├── models.py           # SQLAlchemy Report schema
│   │   ├── schemas.py          # Pydantic v2 validation models
│   │   ├── seed.py             # Baseline demo data seeder
│   │   └── main.py             # FastAPI entrypoint
│   ├── tests/
│   │   └── test_ml_engine.py   # Automated unit tests for all ML modules
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # OperationsMap, DispatcherDrawer, KPICards, etc.
│   │   ├── pages/              # Overview, SubmitComplaint, TrackComplaint, AllReports
│   │   ├── api/                # Axios/fetch client bindings
│   │   ├── lib/                # Formatting & utility functions
│   │   ├── index.css           # Design system tokens and styling
│   │   └── types.ts            # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

---

## Quick Start Guide

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Seed 7 demonstration reports if database is empty:
python -m app.seed

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

In a new terminal window:
```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
- Operations Center Dashboard: `http://localhost:5173/`
- Citizen Submit Page: `http://localhost:5173/submit`
- Public Tracking Page: `http://localhost:5173/track`

---

## Automated Testing

Run the local ML unit test suite:
```bash
backend\venv\Scripts\python.exe -m unittest discover -s backend/tests -p test_*.py
```

Run frontend production build and lint checks:
```bash
npm --prefix frontend run build
npm --prefix frontend run lint
```

---

## Honest AI Disclosure

CivicPulse AI operates 100% locally on-premise without external cloud APIs. 
- Classification and recommendations use deterministic local algorithms, TF-IDF vectorization, and domain standard operating procedures.
- Duplicate detection blends text cosine similarity with spatial proximity.
- Hotspot detection relies on mathematical density clustering (DBSCAN).
- Priority scores are explainable decision-support heuristics designed for municipal triage, requiring human authority confirmation before dispatch.
