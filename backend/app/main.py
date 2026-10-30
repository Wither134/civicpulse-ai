"""
CivicPulse AI — FastAPI entry point.

Run from the backend folder:
    .\\venv\\Scripts\\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import reports


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create database tables on startup if they do not exist yet."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CivicPulse AI",
    description="Civic complaint management API. AI analysis is not included in this initial backend.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the Vite frontend on 5173 or 5174 (localhost and 127.0.0.1).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router)


@app.get("/health")
def health_check():
    """Simple liveness check for the frontend and for local testing."""
    return {"status": "ok"}
