"""
Router: Sample Experiments Library
GET /api/experiments        — list summary of all experiments
GET /api/experiments/{id}   — full detail for one experiment
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any, Dict, List

from services.sample_experiments import SAMPLE_EXPERIMENTS

router = APIRouter(prefix="/experiments", tags=["experiments"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class ExperimentSummary(BaseModel):
    id: str
    name: str
    type: str
    status: str
    verdict: str
    description: str


class ExperimentDetail(BaseModel):
    id: str
    name: str
    type: str
    description: str
    hypothesis: str
    status: str
    verdict: str
    primary_metric: Dict[str, Any]
    guardrail_metrics: List[Dict[str, Any]]
    interpretation: str
    lessons: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _find_experiment(experiment_id: str) -> dict:
    for exp in SAMPLE_EXPERIMENTS:
        if exp["id"] == experiment_id:
            return exp
    raise HTTPException(
        status_code=404,
        detail=f"Experiment '{experiment_id}' not found",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[ExperimentSummary])
def list_experiments():
    """Return a summary list of all pre-built sample experiments."""
    return [
        ExperimentSummary(
            id=exp["id"],
            name=exp["name"],
            type=exp["type"],
            status=exp["status"],
            verdict=exp["verdict"],
            description=exp["description"],
        )
        for exp in SAMPLE_EXPERIMENTS
    ]


@router.get("/{experiment_id}", response_model=ExperimentDetail)
def get_experiment(experiment_id: str):
    """Return full detail (including statistical results) for a single experiment."""
    exp = _find_experiment(experiment_id)
    return ExperimentDetail(**exp)
