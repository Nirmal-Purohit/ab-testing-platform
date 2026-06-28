"""
Router: Statistical Analysis
POST /api/analyze/run-test
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from services.statistics import (
    run_proportion_ztest,
    run_welch_ttest,
    run_mann_whitney,
)

router = APIRouter(prefix="/analyze", tags=["analyze"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class RunTestRequest(BaseModel):
    metric_type: str = Field(..., description="'proportion' or 'continuous'")

    # Common
    control_n: int = Field(..., ge=1)
    treatment_n: int = Field(..., ge=1)
    alpha: float = Field(0.05, ge=0.001, le=0.5)
    two_tailed: bool = Field(True)
    include_mann_whitney: bool = Field(False)

    # Proportion-specific
    control_conversions: Optional[int] = Field(None, ge=0)
    treatment_conversions: Optional[int] = Field(None, ge=0)

    # Continuous-specific
    control_mean: Optional[float] = None
    control_std: Optional[float] = None
    treatment_mean: Optional[float] = None
    treatment_std: Optional[float] = None


class ProportionResult(BaseModel):
    test_type: str
    control_rate: float
    treatment_rate: float
    observed_lift_pp: float
    relative_lift_pct: float
    p_value: float
    ci_lower: float
    ci_upper: float
    significant: bool
    effect_size_cohens_h: float
    interpretation: str


class ContinuousResult(BaseModel):
    test_type: str
    observed_lift: float
    relative_lift_pct: float
    p_value: float
    ci_lower: float
    ci_upper: float
    significant: bool
    effect_size_cohens_d: float
    interpretation: str


class MannWhitneyResult(BaseModel):
    u_statistic: float
    p_value: float
    significant: bool
    probability_of_superiority: float
    interpretation: str


class RunTestResponse(BaseModel):
    primary_result: dict
    mann_whitney_result: Optional[MannWhitneyResult] = None


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/run-test", response_model=RunTestResponse)
def run_test(body: RunTestRequest):
    """
    Run the appropriate statistical test based on metric type and return
    full results including effect size, CI, and plain-English interpretation.
    """
    if body.metric_type not in ("proportion", "continuous"):
        raise HTTPException(
            status_code=422,
            detail="metric_type must be 'proportion' or 'continuous'",
        )

    primary_result: dict = {}
    mann_whitney_result: Optional[MannWhitneyResult] = None

    # ------------------------------------------------------------------
    # Proportion Z-test
    # ------------------------------------------------------------------
    if body.metric_type == "proportion":
        if body.control_conversions is None or body.treatment_conversions is None:
            raise HTTPException(
                status_code=422,
                detail="control_conversions and treatment_conversions are required for proportion tests",
            )
        if body.control_conversions > body.control_n:
            raise HTTPException(status_code=422, detail="control_conversions cannot exceed control_n")
        if body.treatment_conversions > body.treatment_n:
            raise HTTPException(status_code=422, detail="treatment_conversions cannot exceed treatment_n")

        try:
            result = run_proportion_ztest(
                control_n=body.control_n,
                control_conversions=body.control_conversions,
                treatment_n=body.treatment_n,
                treatment_conversions=body.treatment_conversions,
                alpha=body.alpha,
                two_tailed=body.two_tailed,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Proportion Z-test failed: {exc}")

        primary_result = {
            "test_type": "Two-Proportion Z-Test",
            "control_rate": round(body.control_conversions / body.control_n, 6),
            "treatment_rate": round(body.treatment_conversions / body.treatment_n, 6),
            **result,
        }

    # ------------------------------------------------------------------
    # Continuous: Welch's t-test
    # ------------------------------------------------------------------
    else:
        for field, label in [
            (body.control_mean, "control_mean"),
            (body.control_std, "control_std"),
            (body.treatment_mean, "treatment_mean"),
            (body.treatment_std, "treatment_std"),
        ]:
            if field is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"{label} is required for continuous metric tests",
                )
        if body.control_std <= 0 or body.treatment_std <= 0:  # type: ignore[operator]
            raise HTTPException(status_code=422, detail="Standard deviations must be positive")

        try:
            result = run_welch_ttest(
                control_n=body.control_n,
                control_mean=body.control_mean,  # type: ignore[arg-type]
                control_std=body.control_std,  # type: ignore[arg-type]
                treatment_n=body.treatment_n,
                treatment_mean=body.treatment_mean,  # type: ignore[arg-type]
                treatment_std=body.treatment_std,  # type: ignore[arg-type]
                alpha=body.alpha,
                two_tailed=body.two_tailed,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Welch t-test failed: {exc}")

        primary_result = {
            "test_type": "Welch's Independent Samples t-Test",
            **result,
        }

        # Optional Mann-Whitney
        if body.include_mann_whitney:
            try:
                mw = run_mann_whitney(
                    control_n=body.control_n,
                    control_mean=body.control_mean,  # type: ignore[arg-type]
                    control_std=body.control_std,  # type: ignore[arg-type]
                    treatment_n=body.treatment_n,
                    treatment_mean=body.treatment_mean,  # type: ignore[arg-type]
                    treatment_std=body.treatment_std,  # type: ignore[arg-type]
                    alpha=body.alpha,
                )
                mann_whitney_result = MannWhitneyResult(**mw)
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Mann-Whitney test failed: {exc}")

    return RunTestResponse(
        primary_result=primary_result,
        mann_whitney_result=mann_whitney_result,
    )
