# Requirements Document

## Introduction

This document specifies the requirements for the A/B Testing Frontend — a Next.js + Tailwind
application that provides a visual interface over an existing FastAPI statistical
experimentation backend. The frontend exposes four core modules (Experiment Designer, Results
Analyzer, Sequential Monitoring, Multi-Metric Dashboard) plus a Sample Experiment Library.
It is intended as a standalone, framework-agnostic demonstration of rigorous experimentation
design and statistical inference.

The backend is fully implemented and accessible via REST endpoints. All statistical
computation happens server-side; the frontend is responsible only for input collection,
request dispatch, result rendering, and educational context.

---

## Glossary

- **App**: The Next.js frontend application being specified here.
- **Backend**: The existing FastAPI service that exposes `/api/*` endpoints.
- **Experiment Designer**: The module on `/design` that calculates required sample size and
  power curves.
- **Results Analyzer**: The module on `/analyze` that runs hypothesis tests on supplied data.
- **Sequential Monitor**: The module on `/monitor` that simulates day-by-day p-value
  evolution with O'Brien-Fleming boundaries.
- **Multi-Metric Dashboard**: The section within each experiment detail page that presents
  primary and guardrail metrics with status badges.
- **Experiment Library**: The collection of five pre-built sample experiments accessible
  from the home page and at `/experiments/:id`.
- **Proportion metric**: A metric measured as a conversion rate (successes / total).
- **Continuous metric**: A metric measured as a numeric mean with standard deviation.
- **MDE**: Minimum Detectable Effect — the smallest true difference the experiment is
  designed to detect.
- **OBF boundary**: O'Brien-Fleming alpha-spending boundary used for sequential testing.
- **Status badge**: A coloured label (Win / Loss / Neutral / Warning) used in metric tables.
- **Verdict**: The overall experiment recommendation (Ship / Don't Ship / Investigate /
  Needs More Data / Ship with Caution).

---

## Requirements

### Requirement 1: Application Shell and Navigation

**User Story:** As a visitor, I want consistent navigation and layout across all pages, so
that I can move between modules without losing context.

#### Acceptance Criteria

1. THE App SHALL render a persistent top-level navigation bar on every page that includes
   links to Home (`/`), Experiment Designer (`/design`), Results Analyzer (`/analyze`),
   and Sequential Monitor (`/monitor`).
2. THE App SHALL apply a responsive layout so that all pages are usable on viewport widths
   from 375 px (mobile) to 1440 px (desktop) without horizontal scrolling.
3. WHEN a user navigates to a route that does not exist, THE App SHALL display a 404 page
   that includes a link back to the home page.
4. THE App SHALL surface the backend health status by calling `GET /api/health` on initial
   load; IF the backend returns a non-2xx response, THEN THE App SHALL display a visible
   banner informing the user that the backend is unavailable.

---

### Requirement 2: Home Page — Experiment Library

**User Story:** As a visitor, I want to see an overview of all sample experiments on the
home page, so that I can quickly understand the platform's capabilities and jump into a
specific example.

#### Acceptance Criteria

1. WHEN the home page loads, THE App SHALL call `GET /api/experiments` and render a card
   for each experiment in the response.
2. THE App SHALL display, on each experiment card: the experiment name, type (Proportion /
   Continuous), and status with a Status badge.
3. WHEN a user clicks an experiment card, THE App SHALL navigate to
   `/experiments/:id` where `:id` matches the experiment's `id` field.
4. THE App SHALL include a "Quick Start" call-to-action section on the home page with
   direct links to the Experiment Designer and Results Analyzer.
5. IF `GET /api/experiments` returns an error, THEN THE App SHALL display an inline error
   message in place of the card grid, with a retry button.
6. THE App SHALL display at least one experiment card whose status is `not_significant` and
   at least one whose status is `significant` with a `dont_ship` verdict, so that the
   library demonstrates non-trivial outcomes.

---

### Requirement 3: Experiment Detail Page

**User Story:** As a user, I want to view the full statistical results of a pre-built
experiment, so that I can understand how to interpret A/B test outcomes.

#### Acceptance Criteria

1. WHEN the page at `/experiments/:id` loads, THE App SHALL call
   `GET /api/experiments/:id` and render the full experiment detail.
2. THE App SHALL display: experiment name, type, description, hypothesis, status badge,
   verdict badge, primary metric results table, guardrail metrics table, interpretation
   paragraph, and lessons paragraph.
3. THE App SHALL render the primary metric result with: metric name, control value,
   treatment value, observed lift (with direction indicator), 95 % CI, p-value, and
   significance decision.
4. WHEN a guardrail metric has `status: "warning"`, THE App SHALL highlight that row with
   a Warning badge and display the associated note text.
5. THE App SHALL display the overall Verdict badge using the mapping:
   - `ship` → green "Ship" badge
   - `dont_ship` → red "Don't Ship" badge
   - `ship_with_caution` → amber "Ship with Caution" badge
   - `needs_more_data` → blue "Needs More Data" badge
   - `inconclusive` → grey "Inconclusive" badge
6. IF `GET /api/experiments/:id` returns a 404, THEN THE App SHALL display a "Experiment
   not found" message and a link to the home page.
7. THE App SHALL include a plain-English interpretation block for every statistical result
   displayed, sourced from the `interpretation` field returned by the API.

---

### Requirement 4: Experiment Designer

**User Story:** As a researcher, I want to calculate the required sample size for a planned
experiment, so that I can run a properly powered test.

#### Acceptance Criteria

1. THE App SHALL render an input form on `/design` with the following fields:
   - Metric type (proportion or continuous), baseline value, MDE, significance level α
     (default 0.05), statistical power 1-β (default 0.80), test type (one-tailed or
     two-tailed), daily traffic per variant (optional), and — when continuous is selected —
     baseline standard deviation.
2. WHEN the user submits the form, THE App SHALL call `POST /api/design/sample-size` with
   the form values and display results without a full page reload.
3. THE App SHALL display the following result fields: required sample size per variant,
   total sample size, estimated test duration in days (when daily traffic is provided), and
   any warnings returned by the API.
4. THE App SHALL render the power curve as a line chart (x-axis: sample size per variant,
   y-axis: statistical power 0–1) using Recharts, with a horizontal reference line at the
   target power level.
5. WHEN the metric type is "continuous", THE App SHALL show the baseline standard deviation
   field and hide it when "proportion" is selected.
6. IF `POST /api/design/sample-size` returns a 4xx or 5xx response, THEN THE App SHALL
   display the API's `detail` error message beneath the form without clearing the user's
   inputs.
7. THE App SHALL display inline tooltips or labels explaining α (Type I error rate),
   statistical power (1 − Type II error rate), and MDE adjacent to their respective input
   fields.
8. WHILE the API request is in-flight, THE App SHALL render a loading indicator and disable
   the submit button to prevent duplicate submissions.

---

### Requirement 5: Results Analyzer

**User Story:** As a researcher, I want to enter observed experiment data and receive full
statistical test results, so that I can determine whether my experiment produced a
significant effect.

#### Acceptance Criteria

1. THE App SHALL render an input form on `/analyze` with the following fields:
   - Metric type (proportion or continuous), control group size, treatment group size,
     significance level α (default 0.05), test type (one-tailed or two-tailed), and — for
     proportion — control conversions and treatment conversions; for continuous — control
     mean, control std, treatment mean, treatment std.
2. WHEN the user submits the form, THE App SHALL call `POST /api/analyze/run-test` and
   render results without a full page reload.
3. THE App SHALL display: test type label, observed lift with directional arrow (↑/↓),
   relative lift percentage, p-value, 95 % confidence interval, significance decision
   (Significant / Not Significant), and effect size (Cohen's h for proportion; Cohen's d
   for continuous).
4. THE App SHALL render the confidence interval as a horizontal interval bar chart centred
   at the observed lift, with a vertical zero line, using Recharts.
5. WHEN the metric type is "continuous", THE App SHALL show a toggle to include the
   Mann-Whitney U test; WHEN enabled, THE App SHALL display the Mann-Whitney results
   (U statistic, p-value, probability of superiority, interpretation) beneath the primary
   result.
6. THE App SHALL render a distribution overlap visualisation showing the estimated control
   and treatment distributions as two overlapping bell curves using Recharts.
7. THE App SHALL display a plain-English interpretation block sourced from the `interpretation`
   field in the API response for both the primary result and, when present, the
   Mann-Whitney result.
8. IF `POST /api/analyze/run-test` returns a 4xx or 5xx response, THEN THE App SHALL
   display the API's `detail` error message and preserve all form inputs.
9. WHILE the API request is in-flight, THE App SHALL render a loading indicator and disable
   the submit button.

---

### Requirement 6: Sequential Monitor

**User Story:** As a researcher, I want to see how p-values evolve over the course of an
experiment, so that I understand the peeking problem and when it is safe to stop.

#### Acceptance Criteria

1. THE App SHALL render an input form on `/monitor` with the following fields: baseline
   conversion rate, true daily effect (absolute lift; 0 for null hypothesis), daily traffic
   per variant, total experiment days, and overall significance level α (default 0.05).
2. WHEN the user submits the form, THE App SHALL call `POST /api/monitor/simulate` and
   render the simulation results without a full page reload.
3. THE App SHALL render an interactive line chart (x-axis: day, y-axis: p-value) showing
   two series: "Naive p-value" and "O'Brien-Fleming boundary", using Recharts.
4. THE App SHALL display a horizontal reference line at α on the p-value chart to mark the
   naive significance threshold.
5. WHEN `safe_stop_day` is non-null in the API response, THE App SHALL mark that day on
   the chart with a vertical annotation and display a "Safe to Stop" indicator; WHEN
   `safe_stop_day` is null, THE App SHALL display a "Keep Running" indicator.
6. THE App SHALL display `false_positive_rate_naive` and `false_positive_rate_sequential`
   as two comparison statistics with a brief explanation of why the naive rate is inflated.
7. THE App SHALL include a prose explanation of the peeking problem and the O'Brien-Fleming
   correction visible on the page, independent of simulation results.
8. IF `POST /api/monitor/simulate` returns a 4xx or 5xx response, THEN THE App SHALL
   display the API error detail and preserve the form inputs.
9. WHILE the API request is in-flight, THE App SHALL render a loading indicator and disable
   the submit button.

---

### Requirement 7: Multi-Metric Dashboard

**User Story:** As a researcher, I want to see all metrics for an experiment in a single
table with status badges, so that I can make a holistic ship/don't-ship decision.

#### Acceptance Criteria

1. THE App SHALL render a metric summary table on the experiment detail page
   (`/experiments/:id`) with one row per metric, containing: metric name, control value,
   treatment value, observed lift, p-value, and status badge.
2. THE App SHALL assign status badges according to the following rules:
   - `significant: true` and positive lift → "Win" (green)
   - `significant: true` and negative lift → "Loss" (red)
   - `significant: false` → "Neutral" (grey)
   - guardrail metric with `status: "warning"` → "Warning" (amber), regardless of
     significance
3. THE App SHALL display an overall experiment verdict beneath the metric table using the
   verdict badge defined in Requirement 3 AC 5.
4. WHERE an experiment has at least one guardrail metric with `status: "warning"`, THE App
   SHALL display a callout box explaining that a guardrail metric has flagged a potential
   concern, before the verdict badge.
5. THE App SHALL display a plain-English recommendation paragraph sourced from the
   `interpretation` field of the experiment, below the verdict.

---

### Requirement 8: Statistical Concept Explanations

**User Story:** As a user learning about experimentation, I want brief explanations of
statistical terms visible in context, so that I can understand what each number means
without leaving the page.

#### Acceptance Criteria

1. THE App SHALL display inline explanatory labels or tooltips for the following terms
   wherever they appear as data labels or form fields: Type I error (α), Type II error (β),
   statistical power (1 − β), p-value, confidence interval, effect size, and MDE.
2. THE App SHALL include a "What does this mean?" expandable section on the Results
   Analyzer results panel that explains: p-value interpretation, confidence interval
   interpretation, and effect size interpretation in plain English.
3. THE App SHALL NOT display any statistical output without an accompanying plain-English
   interpretation, whether sourced from the API `interpretation` field or composed by the
   App.

---

### Requirement 9: API Integration and Error Handling

**User Story:** As a developer, I want the frontend to communicate reliably with the
backend and handle failures gracefully, so that users receive actionable feedback on any
API error.

#### Acceptance Criteria

1. THE App SHALL make all API calls to a configurable base URL defined in an environment
   variable (`NEXT_PUBLIC_API_URL`), defaulting to `http://localhost:8000`.
2. WHEN any API call returns a network error or timeout, THE App SHALL display a
   user-facing error message and offer a retry action.
3. THE App SHALL parse the FastAPI `detail` field from error responses and display it
   verbatim in the error message to the user.
4. THE App SHALL send `Content-Type: application/json` and receive `Accept:
   application/json` headers on all POST requests to the Backend.
5. IF the Backend returns HTTP 422 (Unprocessable Entity), THEN THE App SHALL map the
   response's validation errors to the relevant form fields and highlight them inline.

---

### Requirement 10: Performance and Accessibility

**User Story:** As a user on a mobile device or assistive technology, I want the
application to load quickly and be navigable without a mouse, so that the platform is
inclusive and responsive.

#### Acceptance Criteria

1. THE App SHALL achieve a Largest Contentful Paint (LCP) under 2.5 seconds on a simulated
   4G mobile connection for the home page.
2. THE App SHALL meet WCAG 2.1 AA colour contrast requirements (minimum 4.5:1 for normal
   text, 3:1 for large text) for all text and interactive elements.
3. THE App SHALL be fully keyboard navigable: all interactive elements SHALL be reachable
   and operable via Tab and Enter/Space keys.
4. THE App SHALL associate all form inputs with visible `<label>` elements and include
   appropriate `aria-describedby` attributes linking inputs to their tooltip or help text.
5. WHEN a form submission error occurs, THE App SHALL move focus to the error message
   element so that screen reader users are immediately notified.
6. THE App SHALL not render any content that flashes or blinks more than three times per
   second (WCAG 2.3.1 — seizure prevention).
