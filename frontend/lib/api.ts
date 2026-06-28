const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface PowerPoint { sample_size: number; power: number }

export interface SampleSizeResponse {
  sample_size_per_variant: number;
  total_sample_size: number;
  estimated_days: number | null;
  power_curve: PowerPoint[];
  warnings: string[];
}

export interface AnalysisResult {
  primary_result: Record<string, unknown>;
  mann_whitney_result?: {
    u_statistic: number;
    p_value: number;
    significant: boolean;
    probability_of_superiority: number;
    interpretation: string;
  } | null;
}

export interface SimulateResponse {
  days: number[];
  naive_pvalues: number[];
  ofb_boundaries: number[];
  safe_stop_day: number | null;
  false_positive_rate_naive: number;
  false_positive_rate_sequential: number;
}

export interface ExperimentSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  verdict: string;
  description: string;
}

export interface ExperimentDetail extends ExperimentSummary {
  hypothesis: string;
  primary_metric: Record<string, unknown>;
  guardrail_metrics: Record<string, unknown>[];
  interpretation: string;
  lessons: string;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const api = {
  designSampleSize: (body: Record<string, unknown>) =>
    post<SampleSizeResponse>("/design/sample-size", body),

  analyzeRunTest: (body: Record<string, unknown>) =>
    post<AnalysisResult>("/analyze/run-test", body),

  monitorSimulate: (body: Record<string, unknown>) =>
    post<SimulateResponse>("/monitor/simulate", body),

  listExperiments: () => get<ExperimentSummary[]>("/experiments"),

  getExperiment: (id: string) => get<ExperimentDetail>(`/experiments/${id}`),
};
