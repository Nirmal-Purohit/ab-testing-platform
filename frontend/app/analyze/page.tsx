"use client";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { api, AnalysisResult } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusBadge from "@/components/StatusBadge";
import StatConcept from "@/components/StatConcept";

interface FormState {
  metric_type: "proportion" | "continuous";
  control_n: string;
  treatment_n: string;
  alpha: string;
  two_tailed: boolean;
  include_mann_whitney: boolean;
  // proportion
  control_conversions: string;
  treatment_conversions: string;
  // continuous
  control_mean: string;
  control_std: string;
  treatment_mean: string;
  treatment_std: string;
}

const PROP_DEFAULTS: Partial<FormState> = {
  control_n: "8000",
  treatment_n: "8000",
  control_conversions: "1456",
  treatment_conversions: "1736",
};

const CONT_DEFAULTS: Partial<FormState> = {
  control_n: "12000",
  treatment_n: "12000",
  control_mean: "4.82",
  control_std: "12.40",
  treatment_mean: "5.61",
  treatment_std: "13.10",
};

const DEFAULTS: FormState = {
  metric_type: "proportion",
  alpha: "0.05",
  two_tailed: true,
  include_mann_whitney: false,
  control_conversions: "",
  treatment_conversions: "",
  control_mean: "",
  control_std: "",
  treatment_mean: "",
  treatment_std: "",
  ...PROP_DEFAULTS,
} as FormState;

// Build a rough normal-ish distribution for the overlap chart
function buildDistData(mean: number, std: number, label: string, n = 80) {
  const lo = mean - 4 * std;
  const hi = mean + 4 * std;
  const step = (hi - lo) / n;
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = lo + i * step;
    const density =
      (1 / (std * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * ((x - mean) / std) ** 2);
    return { x: +x.toFixed(4), [label]: +density.toFixed(6) };
  });
}

function mergeDistributions(
  cData: { x: number; control: number }[],
  tData: { x: number; treatment: number }[]
) {
  const map = new Map<number, Record<string, number>>();
  cData.forEach((d) => {
    map.set(d.x, { x: d.x, control: d.control });
  });
  tData.forEach((d) => {
    const existing = map.get(d.x) ?? { x: d.x, control: 0 };
    map.set(d.x, { ...existing, treatment: d.treatment });
  });
  return Array.from(map.values()).sort((a, b) => a.x - b.x);
}

export default function AnalyzePage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function switchType(type: "proportion" | "continuous") {
    setForm((f) => ({
      ...f,
      metric_type: type,
      ...(type === "proportion" ? PROP_DEFAULTS : CONT_DEFAULTS),
    }));
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        metric_type: form.metric_type,
        control_n: parseInt(form.control_n),
        treatment_n: parseInt(form.treatment_n),
        alpha: parseFloat(form.alpha),
        two_tailed: form.two_tailed,
        include_mann_whitney: form.include_mann_whitney,
      };
      if (form.metric_type === "proportion") {
        body.control_conversions = parseInt(form.control_conversions);
        body.treatment_conversions = parseInt(form.treatment_conversions);
      } else {
        body.control_mean = parseFloat(form.control_mean);
        body.control_std = parseFloat(form.control_std);
        body.treatment_mean = parseFloat(form.treatment_mean);
        body.treatment_std = parseFloat(form.treatment_std);
      }
      const res = await api.analyzeRunTest(body);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Distribution chart data
  let distData: Record<string, number>[] = [];
  if (result) {
    const pr = result.primary_result;
    if (form.metric_type === "proportion") {
      const p1 = pr.control_rate as number;
      const p2 = pr.treatment_rate as number;
      const n1 = parseInt(form.control_n);
      const n2 = parseInt(form.treatment_n);
      const std1 = Math.sqrt((p1 * (1 - p1)) / n1);
      const std2 = Math.sqrt((p2 * (1 - p2)) / n2);
      const cData = buildDistData(p1 * 100, std1 * 100, "control");
      const tData = buildDistData(p2 * 100, std2 * 100, "treatment");
      distData = mergeDistributions(
        cData as { x: number; control: number }[],
        tData as { x: number; treatment: number }[]
      );
    } else {
      const cData = buildDistData(
        parseFloat(form.control_mean),
        parseFloat(form.control_std) / Math.sqrt(parseInt(form.control_n)),
        "control"
      );
      const tData = buildDistData(
        parseFloat(form.treatment_mean),
        parseFloat(form.treatment_std) / Math.sqrt(parseInt(form.treatment_n)),
        "treatment"
      );
      distData = mergeDistributions(
        cData as { x: number; control: number }[],
        tData as { x: number; treatment: number }[]
      );
    }
  }

  const pr = result?.primary_result;
  const isSignificant = pr?.significant as boolean | undefined;
  const liftRaw = pr?.observed_lift_pp as number | undefined;
  const liftLabel =
    form.metric_type === "proportion" && liftRaw !== undefined
      ? `${liftRaw > 0 ? "+" : ""}${liftRaw.toFixed(2)}pp`
      : liftRaw !== undefined
      ? `${liftRaw > 0 ? "+" : ""}${liftRaw.toFixed(4)}`
      : "—";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Results Analyzer</h1>
        <p className="text-slate-400 mt-1">
          Enter your experiment results and get the correct statistical test,
          confidence interval, and a plain-English interpretation.
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px,1fr] gap-8 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* Metric type toggle */}
          <div className="flex gap-2">
            {(["proportion", "continuous"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchType(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  form.metric_type === t
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "proportion" ? "Proportion" : "Continuous"}
              </button>
            ))}
          </div>

          {/* Shared */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Control N</label>
              <input className="input" type="number" min="1" value={form.control_n}
                onChange={(e) => set("control_n", e.target.value)} required />
            </div>
            <div>
              <label className="label">Treatment N</label>
              <input className="input" type="number" min="1" value={form.treatment_n}
                onChange={(e) => set("treatment_n", e.target.value)} required />
            </div>
          </div>

          {form.metric_type === "proportion" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Control Conversions</label>
                <input className="input" type="number" min="0" value={form.control_conversions}
                  onChange={(e) => set("control_conversions", e.target.value)} required />
              </div>
              <div>
                <label className="label">Treatment Conversions</label>
                <input className="input" type="number" min="0" value={form.treatment_conversions}
                  onChange={(e) => set("treatment_conversions", e.target.value)} required />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Control Mean</label>
                  <input className="input" type="number" step="any" value={form.control_mean}
                    onChange={(e) => set("control_mean", e.target.value)} required />
                </div>
                <div>
                  <label className="label">Control Std Dev</label>
                  <input className="input" type="number" step="any" min="0.001" value={form.control_std}
                    onChange={(e) => set("control_std", e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Treatment Mean</label>
                  <input className="input" type="number" step="any" value={form.treatment_mean}
                    onChange={(e) => set("treatment_mean", e.target.value)} required />
                </div>
                <div>
                  <label className="label">Treatment Std Dev</label>
                  <input className="input" type="number" step="any" min="0.001" value={form.treatment_std}
                    onChange={(e) => set("treatment_std", e.target.value)} required />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Significance Level α</label>
              <select className="select" value={form.alpha} onChange={(e) => set("alpha", e.target.value)}>
                <option value="0.01">0.01</option>
                <option value="0.05">0.05</option>
                <option value="0.10">0.10</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input type="checkbox" className="accent-blue-500" checked={form.two_tailed}
                  onChange={(e) => set("two_tailed", e.target.checked)} />
                <span className="text-sm text-slate-300">Two-tailed</span>
              </label>
            </div>
          </div>

          {form.metric_type === "continuous" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-blue-500" checked={form.include_mann_whitney}
                onChange={(e) => set("include_mann_whitney", e.target.checked)} />
              <span className="text-sm text-slate-300">Include Mann-Whitney U test</span>
            </label>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading && <LoadingSpinner size={16} />}
            {loading ? "Running…" : "Run Statistical Test"}
          </button>
        </form>

        {/* Results panel */}
        <div className="space-y-6">
          {error && (
            <div className="card border-red-500/30 text-red-400 text-sm">⚠ {error}</div>
          )}

          {result && pr && (
            <>
              {/* Decision banner */}
              <div className={`card border-2 ${isSignificant ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-700"}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">
                      {pr.test_type as string}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className={`text-3xl font-bold ${isSignificant ? "text-emerald-400" : "text-slate-300"}`}>
                        {liftLabel}
                      </span>
                      <div className="space-y-1">
                        <StatusBadge status={isSignificant ? "significant" : "not_significant"} />
                        <p className="text-xs text-slate-500">
                          {(pr.relative_lift_pct as number) > 0 ? "+" : ""}{(pr.relative_lift_pct as number).toFixed(1)}% relative
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">p-value</p>
                    <p className={`text-2xl font-mono font-bold ${isSignificant ? "text-emerald-400" : "text-slate-400"}`}>
                      {(pr.p_value as number) < 0.001 ? "<0.001" : (pr.p_value as number).toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "95% CI Lower",
                    value: `${(pr.ci_lower as number) > 0 ? "+" : ""}${(pr.ci_lower as number).toFixed(3)}${form.metric_type === "proportion" ? "pp" : ""}`,
                  },
                  {
                    label: "95% CI Upper",
                    value: `${(pr.ci_upper as number) > 0 ? "+" : ""}${(pr.ci_upper as number).toFixed(3)}${form.metric_type === "proportion" ? "pp" : ""}`,
                  },
                  {
                    label: form.metric_type === "proportion" ? "Cohen's h" : "Cohen's d",
                    value: (
                      (pr.effect_size_cohens_h ?? pr.effect_size_cohens_d) as number
                    )?.toFixed(4) ?? "—",
                  },
                  {
                    label: "Decision",
                    value: isSignificant ? "Reject H₀" : "Fail to reject H₀",
                    highlight: isSignificant,
                  },
                ].map((s) => (
                  <div key={s.label} className="card-sm text-center">
                    <p className={`text-lg font-bold ${s.highlight ? "text-emerald-400" : "text-slate-200"}`}>
                      {s.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Interpretation */}
              <div className="card bg-slate-800/40 border-slate-700/50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Interpretation
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {pr.interpretation as string}
                </p>
                {!isSignificant && (
                  <p className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-3">
                    ⚠ Not statistically significant. This does not mean the null
                    is true — it means there is insufficient evidence to reject
                    it. Consider increasing your sample size.
                  </p>
                )}
              </div>

              {/* Distribution overlap chart */}
              {distData.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-200 mb-1">
                    Sampling Distribution Overlap
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Distribution of the sample means under the Central Limit
                    Theorem. Less overlap = stronger evidence of a real effect.
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={distData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="x" stroke="#475569" tick={{ fontSize: 10 }}
                        tickFormatter={(v) => typeof v === "number" ? v.toFixed(2) : v} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={() => ""} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number, name: string) => [v.toFixed(5), name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="control" stroke="#64748b" fill="#64748b" fillOpacity={0.3}
                        strokeWidth={1.5} name="Control" />
                      <Area type="monotone" dataKey="treatment" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3}
                        strokeWidth={1.5} name="Treatment" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Mann-Whitney */}
              {result.mann_whitney_result && (
                <div className="card border-slate-700/50 bg-slate-800/30">
                  <h3 className="font-semibold text-slate-300 mb-3 text-sm">
                    Mann-Whitney U Test (Non-Parametric)
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="card-sm text-center">
                      <p className="text-base font-bold text-slate-200">
                        {result.mann_whitney_result.u_statistic.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-500">U statistic</p>
                    </div>
                    <div className="card-sm text-center">
                      <p className="text-base font-bold text-slate-200">
                        {result.mann_whitney_result.p_value < 0.001
                          ? "<0.001"
                          : result.mann_whitney_result.p_value.toFixed(4)}
                      </p>
                      <p className="text-xs text-slate-500">p-value</p>
                    </div>
                    <div className="card-sm text-center">
                      <p className="text-base font-bold text-slate-200">
                        {result.mann_whitney_result.probability_of_superiority.toFixed(3)}
                      </p>
                      <p className="text-xs text-slate-500">P(treatment &gt; control)</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    {result.mann_whitney_result.interpretation}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Concepts */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Key concepts</h3>
            <StatConcept icon="p" term="p-value"
              definition="Probability of this result (or more extreme) given the null is true. NOT the probability that your hypothesis is correct." />
            <StatConcept icon="CI" term="Confidence Interval"
              definition="Range of plausible values for the true effect. A 95% CI that excludes zero is statistically significant at α=0.05." />
            <StatConcept icon="Δ" term="Effect Size"
              definition="Cohen's h (proportions) or Cohen's d (continuous) measures the magnitude of the difference independent of sample size." />
          </div>
        </div>
      </div>
    </div>
  );
}
