"""
Pre-built sample experiments with embedded statistical results.

Each experiment represents a realistic A/B test scenario with full
computed stats so the frontend can render detailed result views without
needing to re-run calculations.
"""

SAMPLE_EXPERIMENTS = [
    # ------------------------------------------------------------------
    # 1. Checkout Button Colour — NOT SIGNIFICANT (underpowered)
    # ------------------------------------------------------------------
    {
        "id": "checkout-button-colour",
        "name": "Checkout Button Colour",
        "type": "proportion",
        "description": (
            "Tested changing the checkout CTA button from grey (#9E9E9E) to "
            "high-contrast orange (#FF6600) to improve click-through rate on "
            "the final checkout step."
        ),
        "hypothesis": (
            "Changing the button colour to high-contrast orange will increase "
            "checkout conversion rate by at least 1 percentage point."
        ),
        "status": "not_significant",
        "verdict": "dont_ship",
        "primary_metric": {
            "name": "Checkout Conversion Rate",
            "control_n": 1500,
            "control_conversions": 48,
            "treatment_n": 1500,
            "treatment_conversions": 51,
            "control_rate": 0.032,
            "treatment_rate": 0.034,
            "observed_lift_pp": 0.2,
            "relative_lift_pct": 6.25,
            "p_value": 0.6832,
            "ci_lower": -0.77,
            "ci_upper": 1.17,
            "significant": False,
            "effect_size_cohens_h": 0.0113,
            "alpha": 0.05,
            "two_tailed": True,
            "interpretation": (
                "The treatment increased the conversion rate by 0.20 percentage "
                "points (+6.3% relative). This result is not statistically significant "
                "(p=0.6832, two-tailed α=0.05). The confidence interval spans both "
                "negative and positive values, indicating we cannot rule out no effect."
            ),
        },
        "guardrail_metrics": [
            {
                "name": "Page Load Time",
                "status": "ok",
                "note": "No significant change in page load time detected.",
            }
        ],
        "interpretation": (
            "With only 1 500 users per variant and a baseline rate of 3.2%, this "
            "test was severely underpowered. The observed +0.2 pp lift cannot be "
            "distinguished from random noise."
        ),
        "lessons": (
            "Classic underpowered test. A proper sample size calculation for detecting "
            "a 1 pp lift at 80% power requires ~3 800 users per variant at this baseline. "
            "Always run a power analysis before launching. Consider re-running with "
            "adequate sample size before drawing conclusions about button colour."
        ),
    },

    # ------------------------------------------------------------------
    # 2. Email Subject Line — SIGNIFICANT WIN
    # ------------------------------------------------------------------
    {
        "id": "email-subject-line",
        "name": "Email Subject Line Test",
        "type": "proportion",
        "description": (
            "Compared a curiosity-gap subject line ('You won't believe what's new…') "
            "against the control's direct subject line ('See our latest products') "
            "across 16 000 subscribers split evenly."
        ),
        "hypothesis": (
            "A curiosity-gap subject line will increase email open rate by at least "
            "2 percentage points compared to the direct subject line."
        ),
        "status": "significant",
        "verdict": "ship",
        "primary_metric": {
            "name": "Email Open Rate",
            "control_n": 8000,
            "control_conversions": 1456,
            "treatment_n": 8000,
            "treatment_conversions": 1736,
            "control_rate": 0.182,
            "treatment_rate": 0.217,
            "observed_lift_pp": 3.5,
            "relative_lift_pct": 19.23,
            "p_value": 0.000003,
            "ci_lower": 2.01,
            "ci_upper": 4.99,
            "significant": True,
            "effect_size_cohens_h": 0.0904,
            "alpha": 0.05,
            "two_tailed": True,
            "interpretation": (
                "The treatment increased the open rate by 3.50 percentage points "
                "(+19.2% relative). This result is statistically significant "
                "(p<0.001, two-tailed α=0.05). The 95% CI [2.01 pp, 4.99 pp] "
                "lies entirely above zero, confirming a genuine positive effect."
            ),
        },
        "guardrail_metrics": [
            {
                "name": "Unsubscribe Rate",
                "status": "ok",
                "control_rate": 0.0041,
                "treatment_rate": 0.0039,
                "note": "No meaningful increase in unsubscribes; audience tolerance is fine.",
            },
            {
                "name": "Click-to-Open Rate",
                "status": "ok",
                "control_rate": 0.231,
                "treatment_rate": 0.228,
                "note": "Slightly lower CTOR suggests curiosity-openers are mildly less engaged, "
                        "but the absolute delta is negligible.",
            },
        ],
        "interpretation": (
            "Strong, well-powered result. The curiosity-gap subject line drives a "
            "meaningful lift in opens with no harm to list health. Safe to roll out."
        ),
        "lessons": (
            "Curiosity-gap copy works at scale. The test was adequately powered (n=8 000 "
            "per variant) and ran for a full send cycle, avoiding day-of-week confounds. "
            "Monitor CTOR and unsubscribes over the next 3 campaigns to ensure the "
            "novelty effect doesn't decay."
        ),
    },

    # ------------------------------------------------------------------
    # 3. Recommendation Algorithm — SIGNIFICANT WIN (revenue up, return rate ⚠️)
    # ------------------------------------------------------------------
    {
        "id": "recommendation-algorithm",
        "name": "Personalised Recommendation Algorithm",
        "type": "continuous",
        "description": (
            "Replaced the collaborative-filtering recommendation engine with a "
            "deep-learning model trained on session embeddings to increase "
            "average order value."
        ),
        "hypothesis": (
            "The deep-learning recommender will increase average revenue per session "
            "by at least $0.50 compared to the collaborative-filtering baseline."
        ),
        "status": "significant",
        "verdict": "ship_with_caution",
        "primary_metric": {
            "name": "Revenue per Session (USD)",
            "control_n": 12000,
            "control_mean": 4.82,
            "control_std": 12.40,
            "treatment_n": 12000,
            "treatment_mean": 5.61,
            "treatment_std": 13.10,
            "observed_lift_pp": 0.79,
            "relative_lift_pct": 16.39,
            "p_value": 0.0008,
            "ci_lower": 0.33,
            "ci_upper": 1.25,
            "significant": True,
            "effect_size_cohens_d": 0.063,
            "alpha": 0.05,
            "two_tailed": True,
            "interpretation": (
                "The treatment increased average revenue per session by $0.79 "
                "(+16.4% relative). This result is statistically significant "
                "(p=0.0008, two-tailed α=0.05). The 95% CI [$0.33, $1.25] "
                "lies entirely above zero."
            ),
        },
        "guardrail_metrics": [
            {
                "name": "Return / Refund Rate",
                "status": "warning",
                "control_rate": 0.062,
                "treatment_rate": 0.081,
                "observed_lift_pp": 1.9,
                "p_value": 0.0041,
                "significant": True,
                "note": (
                    "⚠️ Return rate increased by +1.9 pp (p=0.004). The algorithm "
                    "may be recommending items that look appealing but don't match "
                    "customer needs. This partially offsets the revenue gain."
                ),
            },
            {
                "name": "Add-to-Cart Rate",
                "status": "ok",
                "control_rate": 0.143,
                "treatment_rate": 0.156,
                "note": "Add-to-cart rate increased modestly — healthy signal.",
            },
            {
                "name": "Page Load Time (p95, ms)",
                "status": "ok",
                "control_mean": 312,
                "treatment_mean": 328,
                "note": "Marginal +16 ms increase within acceptable latency budget.",
            },
        ],
        "interpretation": (
            "The new algorithm significantly lifts revenue but also increases returns. "
            "Net revenue impact should be modelled after accounting for return logistics "
            "costs before full rollout."
        ),
        "lessons": (
            "Guardrail metrics matter as much as primary metrics. Shipping purely on "
            "revenue would mask a real quality problem. Investigate why the model "
            "recommends high-return items — consider adding return-rate signal to "
            "the training objective. Re-test after model adjustment."
        ),
    },

    # ------------------------------------------------------------------
    # 4. Free Shipping Threshold — INCONCLUSIVE (ran too short)
    # ------------------------------------------------------------------
    {
        "id": "free-shipping-threshold",
        "name": "Free Shipping Threshold Change",
        "type": "proportion",
        "description": (
            "Tested lowering the free-shipping threshold from $50 to $35 to "
            "increase checkout completion rate. The test was stopped after only "
            "3 days due to a business decision to pause promotions."
        ),
        "hypothesis": (
            "Lowering the free-shipping threshold to $35 will increase the "
            "checkout completion rate by at least 3 percentage points."
        ),
        "status": "inconclusive",
        "verdict": "needs_more_data",
        "primary_metric": {
            "name": "Checkout Completion Rate",
            "control_n": 400,
            "control_conversions": 88,
            "treatment_n": 400,
            "treatment_conversions": 100,
            "control_rate": 0.220,
            "treatment_rate": 0.250,
            "observed_lift_pp": 3.0,
            "relative_lift_pct": 13.64,
            "p_value": 0.2341,
            "ci_lower": -1.93,
            "ci_upper": 7.93,
            "significant": False,
            "effect_size_cohens_h": 0.0714,
            "alpha": 0.05,
            "two_tailed": True,
            "interpretation": (
                "The treatment showed a promising +3.0 pp lift (+13.6% relative), "
                "but this is not statistically significant (p=0.234) with only 400 "
                "users per variant. The wide CI [−1.9 pp, +7.9 pp] reflects extreme "
                "uncertainty."
            ),
        },
        "guardrail_metrics": [],
        "interpretation": (
            "The test ran for only 3 days and collected ~13% of the required sample. "
            "The directional signal is positive but entirely inconclusive. Do not ship "
            "or reject — collect more data."
        ),
        "lessons": (
            "Never stop a test early without a pre-specified stopping rule. The observed "
            "effect looks encouraging but could easily be noise. A full run requires "
            "~3 100 users per variant for 80% power at this baseline and MDE. "
            "Restart the test and commit to the full duration."
        ),
    },

    # ------------------------------------------------------------------
    # 5. Onboarding Flow Redesign — SIGNIFICANT LOSS
    # ------------------------------------------------------------------
    {
        "id": "onboarding-flow-redesign",
        "name": "Onboarding Flow Redesign",
        "type": "proportion",
        "description": (
            "Replaced the 4-step linear onboarding wizard with a single-page "
            "progressive-disclosure design intended to reduce cognitive load "
            "and increase completion rate for new sign-ups."
        ),
        "hypothesis": (
            "The single-page onboarding design will increase the onboarding "
            "completion rate by at least 5 percentage points."
        ),
        "status": "significant",
        "verdict": "dont_ship",
        "primary_metric": {
            "name": "Onboarding Completion Rate",
            "control_n": 5000,
            "control_conversions": 2100,
            "treatment_n": 5000,
            "treatment_conversions": 1800,
            "control_rate": 0.420,
            "treatment_rate": 0.360,
            "observed_lift_pp": -6.0,
            "relative_lift_pct": -14.29,
            "p_value": 0.0000001,
            "ci_lower": -7.86,
            "ci_upper": -4.14,
            "significant": True,
            "effect_size_cohens_h": -0.1232,
            "alpha": 0.05,
            "two_tailed": True,
            "interpretation": (
                "The treatment decreased the onboarding completion rate by 6.0 "
                "percentage points (−14.3% relative). This result is statistically "
                "significant (p<0.0001, two-tailed α=0.05). The 95% CI "
                "[−7.86 pp, −4.14 pp] lies entirely below zero — a clear, harmful effect."
            ),
        },
        "guardrail_metrics": [
            {
                "name": "Day-7 Retention",
                "status": "warning",
                "control_rate": 0.318,
                "treatment_rate": 0.271,
                "observed_lift_pp": -4.7,
                "p_value": 0.0003,
                "significant": True,
                "note": (
                    "⚠️ Day-7 retention also dropped −4.7 pp, compounding the harm. "
                    "Users who did complete onboarding in the treatment are also "
                    "retaining at a lower rate."
                ),
            },
            {
                "name": "Support Ticket Rate",
                "status": "warning",
                "control_rate": 0.031,
                "treatment_rate": 0.058,
                "note": (
                    "⚠️ Support tickets nearly doubled (+2.7 pp), suggesting users "
                    "are confused by the new layout."
                ),
            },
        ],
        "interpretation": (
            "A clear, statistically significant regression. The redesign hurt completion, "
            "retention, and support load simultaneously. Revert immediately and do not ship."
        ),
        "lessons": (
            "Progressive disclosure added cognitive burden rather than reducing it for this "
            "audience. The single-page format likely overwhelmed new users who benefited from "
            "the structured step-by-step guidance. Run qualitative user research (session "
            "recordings, usability tests) before attempting another onboarding redesign. "
            "The multi-metric harm pattern suggests a systemic UX problem, not just a cosmetic one."
        ),
    },
]
