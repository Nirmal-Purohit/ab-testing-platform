"""
Statistical Experimentation Platform — FastAPI Backend
Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import design, analyze, monitor, experiments

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Statistical Experimentation Platform",
    description=(
        "Backend API for designing, running, and monitoring A/B experiments. "
        "Provides sample-size calculation, hypothesis testing (Z-test, Welch t-test, "
        "Mann-Whitney U), sequential testing simulation, and a library of "
        "pre-built example experiments."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins in development
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

API_PREFIX = "/api"

app.include_router(design.router, prefix=API_PREFIX)
app.include_router(analyze.router, prefix=API_PREFIX)
app.include_router(monitor.router, prefix=API_PREFIX)
app.include_router(experiments.router, prefix=API_PREFIX)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get(f"{API_PREFIX}/health", tags=["health"])
def health_check():
    """Simple liveness probe — returns 200 when the API is up."""
    return {"status": "ok", "service": "experimentation-platform"}
