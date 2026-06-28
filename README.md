# ExperimentLab — Statistical Experimentation Platform

A rigorous, end-to-end A/B testing platform demonstrating experiment design, hypothesis testing, sequential monitoring, and multi-metric analysis.

## Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.9 + FastAPI |
| Statistics | scipy, statsmodels, numpy |
| Frontend | Next.js 14 + Tailwind CSS |
| Charts | Recharts |

## Project Structure

```
AB_Testing_Framework/
  backend/
    main.py                  # FastAPI app
    requirements.txt
    routers/
      design.py              # POST /api/design/sample-size
      analyze.py             # POST /api/analyze/run-test
      monitor.py             # POST /api/monitor/simulate
      experiments.py         # GET  /api/experiments[/:id]
    services/
      statistics.py          # All statistical functions
      sample_experiments.py  # 5 pre-built experiment scenarios
  frontend/
    app/
      page.tsx               # / — Home + experiment library
      design/page.tsx        # /design — Sample size calculator
      analyze/page.tsx       # /analyze — Results analyzer
      monitor/page.tsx       # /monitor — Sequential monitoring
      experiments/[id]/page.tsx  # /experiments/:id — Detail
    components/
      Navbar.tsx
      StatConcept.tsx
      StatusBadge.tsx
      VerdictBanner.tsx
      LoadingSpinner.tsx
    lib/api.ts               # Typed API client
```

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:3000

## Features

- **Experiment Designer** — Sample size calculator with power curve chart, MDE warnings, duration estimate
- **Results Analyzer** — Z-test (proportions), Welch's t-test (continuous), optional Mann-Whitney U; distribution overlap chart; CI visualization
- **Sequential Monitor** — O'Brien-Fleming boundary vs naive peeking; false positive rate comparison; day-by-day status table
- **Multi-Metric Dashboard** — Primary + guardrail metrics, Win/Loss/Warning/Neutral badges, Ship/Don't Ship verdict
- **Sample Experiment Library** — 5 pre-built realistic experiments covering all outcome types

## Statistical Concepts Surfaced

- Type I / Type II error
- Statistical power
- p-value (correctly defined)
- Confidence intervals
- Effect size (Cohen's d, Cohen's h)
- Minimum Detectable Effect
- Alpha spending / O'Brien-Fleming boundary
- The peeking problem
