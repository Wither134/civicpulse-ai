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


import os
import uvicorn

app = FastAPI(
    title="CivicPulse AI",
    description="Municipal Incident Intelligence & Operations API running local ML algorithms.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration: Allow local Vite dev servers + any custom production domains
default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
env_origins = os.environ.get("CORS_ORIGINS", "")
if env_origins.strip():
    extra_origins = [orig.strip() for orig in env_origins.split(",") if orig.strip()]
    allowed_origins = list(set(default_origins + extra_origins))
else:
    allowed_origins = default_origins

# If CORS_ALLOW_ALL is enabled (common for public hackathon demos/API testing)
if os.environ.get("CORS_ALLOW_ALL", "false").lower() in ("true", "1", "yes") or "*" in allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(reports.router)


@app.get("/health")
def health_check():
    """Simple liveness check for frontend, health checks, and Render deploy monitoring."""
    return {"status": "ok"}


if __name__ == "__main__":
    # Render binds automatically using PORT environment variable on 0.0.0.0
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

