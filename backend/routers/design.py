"""
Router: Experiment Design
POST /api/design/sample-size
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from services.statistics import (
    calculate_sample_size_proportion,
    calculate_sample_size_continuous,
    calculate_power_curve,
)

router = APIRouter(prefix="/design", tags=["design"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SampleSizeRequest(BaseModel):
    metric_type: str = Field(..., description="'proportion' or 'continuous'")
    baseline_value: float = Field(..., description="Baseline rate (proportion) or mean (continuous)")
    mde: float = Field(..., description="Minimum detectable effect (absolute)")
    alpha: float = Field(0.05, ge=0.001, le=0.5, description="Significance level")
    power: float = Field(0.80, ge=0.50, le=0.99, description="Desired statistical power")
    two_tailed: bool = Field(True, description="Use a two-tailed test")
    daily_traffic: Optional[int] = Field(None, ge=1, description="Daily visitors per variant (for duration estimate)")
    baseline_std: Optional[float] = Field(None, description="Required for continuous metrics")


class PowerPoint(BaseModel):
    sample_size: int
    power: float


class SampleSizeResponse(BaseModel):
    sample_size_per_variant: int
    total_sample_size: int
    estimated_days: Optional[int]
    power_curve: List[PowerPoint]
    warnings: List[str]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/sample-size", response_model=SampleSizeResponse)
def calculate_sample_size(body: SampleSizeRequest):
    """
    Compute the required sample size per variant for a given experiment design,
    return a power curve, estimated runtime, and any design warnings.
    """
    warnings: List[str] = []

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------
    if body.metric_type not in ("proportion", "continuous"):
        raise HTTPException(
            status_code=422,
            detail="metric_type must be 'proportion' or 'continuous'",
        )

    if body.metric_type == "proportion":
        if not (0 < body.baseline_value < 1):
            raise HTTPException(
                status_code=422,
                detail="baseline_value must be between 0 and 1 for proportion metrics",
            )
        if body.baseline_value + body.mde > 1 or body.baseline_value + body.mde < 0:
            raise HTTPException(
                status_code=422,
                detail="baseline_value + mde must be in (0, 1)",
            )

    if body.metric_type == "continuous":
        if body.baseline_std is None or body.baseline_std <= 0:
            raise HTTPException(
                status_code=422,
                detail="baseline_std must be provided and positive for continuous metrics",
            )

    # ------------------------------------------------------------------
    # Core calculation
    # ------------------------------------------------------------------
    try:
        if body.metric_type == "proportion":
            n = calculate_sample_size_proportion(
                baseline_rate=body.baseline_value,
                mde=body.mde,
                alpha=body.alpha,
                power=body.power,
                two_tailed=body.two_tailed,
            )
        else:
            n = calculate_sample_size_continuous(
                baseline_mean=body.baseline_value,
                baseline_std=body.baseline_std,  # type: ignore[arg-type]
                mde_absolute=body.mde,
                alpha=body.alpha,
                power=body.power,
                two_tailed=body.two_tailed,
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Sample size calculation failed: {exc}")

    total_n = n * 2

    # ------------------------------------------------------------------
    # Duration estimate
    # ------------------------------------------------------------------
    estimated_days: Optional[int] = None
    if body.daily_traffic and body.daily_traffic > 0:
        import math
        estimated_days = math.ceil(n / body.daily_traffic)

    # ------------------------------------------------------------------
    # Warnings
    # ------------------------------------------------------------------
    if body.baseline_value != 0:
        mde_relative = abs(body.mde) / abs(body.baseline_value)
        if mde_relative < 0.10:
            warnings.append(
                f"Your MDE ({body.mde}) is less than 10% of the baseline value "
                f"({body.baseline_value}). Very small MDEs require very large sample "
                "sizes and may not be practically meaningful."
            )

    if estimated_days is not None and estimated_days > 90:
        warnings.append(
            f"Estimated experiment duration is {estimated_days} days, which exceeds "
            "90 days. Consider increasing your MDE or accepting a higher false-negative "
            "rate (lower power) to shorten the runtime."
        )

    # ------------------------------------------------------------------
    # Power curve
    # ------------------------------------------------------------------
    try:
        raw_curve = calculate_power_curve(
            baseline_rate=body.baseline_value,
            mde=body.mde,
            alpha=body.alpha,
            two_tailed=body.two_tailed,
            metric_type=body.metric_type,
            baseline_std=body.baseline_std,
        )
        power_curve = [PowerPoint(**p) for p in raw_curve]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Power curve calculation failed: {exc}")

    return SampleSizeResponse(
        sample_size_per_variant=n,
        total_sample_size=total_n,
        estimated_days=estimated_days,
        power_curve=power_curve,
        warnings=warnings,
    )
