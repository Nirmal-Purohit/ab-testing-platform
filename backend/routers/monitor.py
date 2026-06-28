"""
Router: Sequential Testing Monitor
POST /api/monitor/simulate
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from services.statistics import simulate_sequential_test

router = APIRouter(prefix="/monitor", tags=["monitor"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SimulateRequest(BaseModel):
    baseline_rate: float = Field(..., gt=0, lt=1, description="Baseline conversion rate (0–1)")
    true_effect: float = Field(..., description="True daily effect size (absolute lift, can be 0 for null)")
    daily_traffic_per_variant: int = Field(..., ge=10, description="Daily observations per variant")
    total_days: int = Field(..., ge=2, le=365, description="Total experiment duration in days")
    alpha: float = Field(0.05, ge=0.001, le=0.5, description="Overall significance level")


class SimulateResponse(BaseModel):
    days: list
    naive_pvalues: list
    ofb_boundaries: list
    safe_stop_day: Optional[int]
    false_positive_rate_naive: float
    false_positive_rate_sequential: float


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/simulate", response_model=SimulateResponse)
def simulate(body: SimulateRequest):
    """
    Simulate a sequential A/B test over the specified number of days.

    Returns daily naive p-values alongside O'Brien-Fleming alpha spending
    boundaries, the earliest safe stopping day (if any), and estimated
    false positive rates for both naive repeated peeking and sequential testing.
    """
    treatment_rate = body.baseline_rate + body.true_effect
    if not (0 < treatment_rate < 1):
        raise HTTPException(
            status_code=422,
            detail=(
                f"baseline_rate + true_effect = {treatment_rate:.4f} is outside (0, 1). "
                "Adjust your inputs so the treatment rate is a valid probability."
            ),
        )

    try:
        result = simulate_sequential_test(
            true_effect=body.true_effect,
            baseline_rate=body.baseline_rate,
            daily_traffic_per_variant=body.daily_traffic_per_variant,
            total_days=body.total_days,
            alpha=body.alpha,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Sequential test simulation failed: {exc}")

    return SimulateResponse(**result)
