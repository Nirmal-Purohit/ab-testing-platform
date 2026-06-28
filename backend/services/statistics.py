"""
Core statistical functions for the experimentation platform.
"""

import math
from typing import Optional
import numpy as np
from scipy import stats
from scipy.stats import norm
from statsmodels.stats.proportion import proportion_effectsize
from statsmodels.stats.power import NormalIndPower, TTestIndPower


# ---------------------------------------------------------------------------
# Sample Size Calculations
# ---------------------------------------------------------------------------

def calculate_sample_size_proportion(
    baseline_rate: float,
    mde: float,
    alpha: float,
    power: float,
    two_tailed: bool,
) -> int:
    """
    Calculate required sample size per variant for a proportion metric.

    Args:
        baseline_rate: Control conversion rate (0–1).
        mde: Minimum detectable effect as an absolute change (e.g. 0.02 for +2 pp).
        alpha: Significance level (e.g. 0.05).
        power: Desired statistical power (e.g. 0.80).
        two_tailed: Whether to use a two-tailed test.

    Returns:
        Sample size per variant (integer, rounded up).
    """
    treatment_rate = baseline_rate + mde
    treatment_rate = max(1e-6, min(1 - 1e-6, treatment_rate))

    effect_size = proportion_effectsize(baseline_rate, treatment_rate)

    alternative = "two-sided" if two_tailed else "larger"
    analysis = NormalIndPower()
    n = analysis.solve_power(
        effect_size=abs(effect_size),
        alpha=alpha,
        power=power,
        alternative=alternative,
    )
    return math.ceil(n)


def calculate_sample_size_continuous(
    baseline_mean: float,
    baseline_std: float,
    mde_absolute: float,
    alpha: float,
    power: float,
    two_tailed: bool,
) -> int:
    """
    Calculate required sample size per variant for a continuous metric.

    Args:
        baseline_mean: Control group mean.
        baseline_std: Control group standard deviation.
        mde_absolute: Minimum detectable effect as an absolute difference in means.
        alpha: Significance level.
        power: Desired statistical power.
        two_tailed: Whether to use a two-tailed test.

    Returns:
        Sample size per variant (integer, rounded up).
    """
    if baseline_std <= 0:
        raise ValueError("baseline_std must be positive")

    cohen_d = abs(mde_absolute) / baseline_std
    alternative = "two-sided" if two_tailed else "larger"

    analysis = TTestIndPower()
    n = analysis.solve_power(
        effect_size=cohen_d,
        alpha=alpha,
        power=power,
        alternative=alternative,
    )
    return math.ceil(n)


# ---------------------------------------------------------------------------
# Power Curve
# ---------------------------------------------------------------------------

def calculate_power_curve(
    baseline_rate: float,
    mde: float,
    alpha: float,
    two_tailed: bool,
    metric_type: str,
    baseline_std: Optional[float] = None,
) -> list:
    """
    Compute achieved power for a range of sample sizes around the required n.

    Returns a list of {sample_size, power} dicts suitable for charting.
    """
    if metric_type == "proportion":
        required_n = calculate_sample_size_proportion(
            baseline_rate, mde, alpha, 0.80, two_tailed
        )
    else:
        if baseline_std is None:
            raise ValueError("baseline_std required for continuous metric type")
        required_n = calculate_sample_size_continuous(
            baseline_rate, baseline_std, mde, alpha, 0.80, two_tailed
        )

    # Build a range from ~10 % of required_n to 200 % in 20 steps
    min_n = max(10, math.ceil(required_n * 0.10))
    max_n = math.ceil(required_n * 2.0)
    step = max(1, (max_n - min_n) // 20)
    sample_sizes = list(range(min_n, max_n + step, step))

    alternative = "two-sided" if two_tailed else "larger"
    curve = []

    for n in sample_sizes:
        if metric_type == "proportion":
            treatment_rate = baseline_rate + mde
            treatment_rate = max(1e-6, min(1 - 1e-6, treatment_rate))
            effect_size = abs(proportion_effectsize(baseline_rate, treatment_rate))
            analysis = NormalIndPower()
        else:
            effect_size = abs(mde) / baseline_std  # type: ignore[operator]
            analysis = TTestIndPower()

        pwr = analysis.solve_power(
            effect_size=effect_size,
            nobs1=n,
            alpha=alpha,
            alternative=alternative,
        )
        curve.append({"sample_size": n, "power": round(float(pwr), 4)})

    return curve


# ---------------------------------------------------------------------------
# Hypothesis Tests
# ---------------------------------------------------------------------------

def run_proportion_ztest(
    control_n: int,
    control_conversions: int,
    treatment_n: int,
    treatment_conversions: int,
    alpha: float,
    two_tailed: bool,
) -> dict:
    """
    Two-proportion Z-test (Wald / normal approximation).

    Returns a dict with lift, relative lift, p-value, CI, significance flag,
    Cohen's h, and a plain-English interpretation.
    """
    p1 = control_conversions / control_n
    p2 = treatment_conversions / treatment_n

    # Pooled proportion for the Z statistic
    p_pool = (control_conversions + treatment_conversions) / (control_n + treatment_n)
    se_pool = math.sqrt(p_pool * (1 - p_pool) * (1 / control_n + 1 / treatment_n))

    if se_pool == 0:
        raise ValueError("Pooled standard error is zero; check your inputs.")

    z_stat = (p2 - p1) / se_pool
    p_value = (1 - norm.cdf(abs(z_stat))) * (2 if two_tailed else 1)

    # Confidence interval (unpooled SE)
    se_unpooled = math.sqrt(p1 * (1 - p1) / control_n + p2 * (1 - p2) / treatment_n)
    z_crit = norm.ppf(1 - alpha / (2 if two_tailed else 1))
    diff = p2 - p1
    ci_lower = diff - z_crit * se_unpooled
    ci_upper = diff + z_crit * se_unpooled

    # Cohen's h
    cohens_h = 2 * math.asin(math.sqrt(p2)) - 2 * math.asin(math.sqrt(p1))

    significant = bool(p_value < alpha)
    direction = "increased" if diff > 0 else "decreased"
    sig_text = "statistically significant" if significant else "not statistically significant"

    relative_lift = (diff / p1 * 100) if p1 != 0 else 0.0

    interpretation = (
        f"The treatment {direction} the conversion rate by "
        f"{abs(diff) * 100:.2f} percentage points "
        f"({relative_lift:+.1f}% relative). "
        f"This result is {sig_text} (p={p_value:.4f}, "
        f"{'two' if two_tailed else 'one'}-tailed α={alpha})."
    )

    return {
        "observed_lift_pp": round(diff * 100, 4),
        "relative_lift_pct": round(relative_lift, 2),
        "p_value": round(p_value, 6),
        "ci_lower": round(ci_lower * 100, 4),
        "ci_upper": round(ci_upper * 100, 4),
        "significant": significant,
        "effect_size_cohens_h": round(cohens_h, 4),
        "interpretation": interpretation,
    }


def run_welch_ttest(
    control_n: int,
    control_mean: float,
    control_std: float,
    treatment_n: int,
    treatment_mean: float,
    treatment_std: float,
    alpha: float,
    two_tailed: bool,
) -> dict:
    """
    Welch's independent-samples t-test (unequal variance).

    Generates synthetic samples from summary statistics to leverage scipy,
    then returns lift, CI, Cohen's d, and interpretation.
    """
    rng = np.random.default_rng(42)
    control_sample = rng.normal(control_mean, control_std, int(control_n))
    treatment_sample = rng.normal(treatment_mean, treatment_std, int(treatment_n))

    alternative = "two-sided" if two_tailed else "greater"
    t_stat, p_value = stats.ttest_ind(
        treatment_sample, control_sample, equal_var=False, alternative=alternative
    )

    diff = treatment_mean - control_mean
    pooled_std = math.sqrt(
        ((control_n - 1) * control_std**2 + (treatment_n - 1) * treatment_std**2)
        / (control_n + treatment_n - 2)
    )
    cohens_d = diff / pooled_std if pooled_std != 0 else 0.0

    # Welch–Satterthwaite degrees of freedom for CI
    se = math.sqrt(control_std**2 / control_n + treatment_std**2 / treatment_n)
    df = (control_std**2 / control_n + treatment_std**2 / treatment_n) ** 2 / (
        (control_std**2 / control_n) ** 2 / (control_n - 1)
        + (treatment_std**2 / treatment_n) ** 2 / (treatment_n - 1)
    )
    t_crit = stats.t.ppf(1 - alpha / (2 if two_tailed else 1), df)
    ci_lower = diff - t_crit * se
    ci_upper = diff + t_crit * se

    significant = bool(float(p_value) < alpha)
    direction = "increased" if diff > 0 else "decreased"
    sig_text = "statistically significant" if significant else "not statistically significant"
    relative_lift = (diff / control_mean * 100) if control_mean != 0 else 0.0

    interpretation = (
        f"The treatment {direction} the mean by "
        f"{abs(diff):.4f} ({relative_lift:+.1f}% relative). "
        f"This result is {sig_text} (p={float(p_value):.4f}, "
        f"{'two' if two_tailed else 'one'}-tailed α={alpha})."
    )

    return {
        "observed_lift_pp": round(diff, 4),
        "relative_lift_pct": round(relative_lift, 2),
        "p_value": round(float(p_value), 6),
        "ci_lower": round(ci_lower, 4),
        "ci_upper": round(ci_upper, 4),
        "significant": significant,
        "effect_size_cohens_d": round(cohens_d, 4),
        "interpretation": interpretation,
    }


def run_mann_whitney(
    control_n: int,
    control_mean: float,
    control_std: float,
    treatment_n: int,
    treatment_mean: float,
    treatment_std: float,
    alpha: float,
) -> dict:
    """
    Mann-Whitney U test (non-parametric alternative to Welch's t-test).

    Uses synthetic samples drawn from summary statistics.
    """
    rng = np.random.default_rng(42)
    control_sample = rng.normal(control_mean, control_std, int(control_n))
    treatment_sample = rng.normal(treatment_mean, treatment_std, int(treatment_n))

    u_stat, p_value = stats.mannwhitneyu(
        treatment_sample, control_sample, alternative="two-sided"
    )

    significant = bool(float(p_value) < alpha)
    sig_text = "statistically significant" if significant else "not statistically significant"

    # Common language effect size (probability of superiority)
    prob_superiority = float(u_stat) / (control_n * treatment_n)

    interpretation = (
        f"Mann-Whitney U test: U={u_stat:.1f}, p={float(p_value):.4f}. "
        f"The result is {sig_text} at α={alpha}. "
        f"Probability of superiority: {prob_superiority:.3f}."
    )

    return {
        "u_statistic": round(float(u_stat), 4),
        "p_value": round(float(p_value), 6),
        "significant": significant,
        "probability_of_superiority": round(prob_superiority, 4),
        "interpretation": interpretation,
    }


# ---------------------------------------------------------------------------
# Sequential Testing Simulation
# ---------------------------------------------------------------------------

def simulate_sequential_test(
    true_effect: float,
    baseline_rate: float,
    daily_traffic_per_variant: int,
    total_days: int,
    alpha: float,
    seed: int = 42,
) -> dict:
    """
    Simulate a sequential A/B test over `total_days` days.

    For each day we accumulate observations and compute:
      - Naive p-value (standard two-proportion Z-test)
      - O'Brien-Fleming alpha spending boundary

    We also estimate false positive rates under the null (true_effect = 0)
    via 1 000 Monte Carlo simulations.

    Returns:
        days               : list of day indices
        naive_pvalues      : list of daily p-values
        ofb_boundaries     : list of daily alpha spending boundaries
        safe_stop_day      : first day sequential boundary is crossed (or None)
        false_positive_rate_naive      : FPR for naive repeated peeking
        false_positive_rate_sequential : FPR with O'Brien-Fleming boundary
    """
    rng = np.random.default_rng(seed)

    treatment_rate = baseline_rate + true_effect
    treatment_rate = max(1e-6, min(1 - 1e-6, treatment_rate))

    days = list(range(1, total_days + 1))
    naive_pvalues = []
    ofb_boundaries = []
    safe_stop_day = None

    z_alpha = norm.ppf(1 - alpha / 2)  # overall boundary (two-tailed)
    max_n = daily_traffic_per_variant * total_days

    cumulative_control_conv = 0
    cumulative_treatment_conv = 0

    for day in days:
        n_today = daily_traffic_per_variant
        ctrl_conv = int(rng.binomial(n_today, baseline_rate))
        trt_conv = int(rng.binomial(n_today, treatment_rate))

        cumulative_control_conv += ctrl_conv
        cumulative_treatment_conv += trt_conv

        n_cum = day * daily_traffic_per_variant

        p1 = cumulative_control_conv / n_cum
        p2 = cumulative_treatment_conv / n_cum
        p_pool = (cumulative_control_conv + cumulative_treatment_conv) / (2 * n_cum)
        se = math.sqrt(p_pool * (1 - p_pool) * (2 / n_cum))

        if se > 0:
            z_stat = (p2 - p1) / se
            p_val = 2 * (1 - norm.cdf(abs(z_stat)))
        else:
            p_val = 1.0

        naive_pvalues.append(round(p_val, 6))

        # O'Brien-Fleming spending boundary
        t = n_cum / max_n  # information fraction (0, 1]
        t = max(t, 1e-9)
        alpha_spent = 2 * (1 - norm.cdf(z_alpha / math.sqrt(t)))
        ofb_boundaries.append(round(alpha_spent, 6))

        if safe_stop_day is None and p_val < alpha_spent:
            safe_stop_day = day

    # -----------------------------------------------------------------------
    # False positive rate estimation under the null (1 000 simulations)
    # -----------------------------------------------------------------------
    n_sims = 1000
    naive_fp = 0
    seq_fp = 0

    for _ in range(n_sims):
        sim_ctrl_cum = 0
        sim_trt_cum = 0
        sim_naive_fp = False
        sim_seq_fp = False

        for day in days:
            n_today = daily_traffic_per_variant
            sim_ctrl_cum += int(rng.binomial(n_today, baseline_rate))
            sim_trt_cum += int(rng.binomial(n_today, baseline_rate))  # null: same rate

            n_cum = day * daily_traffic_per_variant
            p1 = sim_ctrl_cum / n_cum
            p2 = sim_trt_cum / n_cum
            p_pool = (sim_ctrl_cum + sim_trt_cum) / (2 * n_cum)
            se = math.sqrt(p_pool * (1 - p_pool) * (2 / n_cum))

            if se > 0:
                z_s = (p2 - p1) / se
                p_s = 2 * (1 - norm.cdf(abs(z_s)))
            else:
                p_s = 1.0

            t = n_cum / max_n
            t = max(t, 1e-9)
            alpha_s = 2 * (1 - norm.cdf(z_alpha / math.sqrt(t)))

            if p_s < alpha:
                sim_naive_fp = True
            if p_s < alpha_s:
                sim_seq_fp = True

        if sim_naive_fp:
            naive_fp += 1
        if sim_seq_fp:
            seq_fp += 1

    return {
        "days": days,
        "naive_pvalues": naive_pvalues,
        "ofb_boundaries": ofb_boundaries,
        "safe_stop_day": safe_stop_day,
        "false_positive_rate_naive": round(naive_fp / n_sims, 4),
        "false_positive_rate_sequential": round(seq_fp / n_sims, 4),
    }
