"use client";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { api, SampleSizeResponse } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatConcept from "@/components/StatConcept";

interface FormState {
  metric_type: "proportion" | "continuous";
  baseline_value: string;
  mde: string;
  alpha: string;
  power: string;
  two_tailed: boolean;
  daily_traffic: string;
  baseline_std: string;
}

const DEFAULTS: FormState = {
  metric_type: "proportion",
  baseline_value: "0.032",
  mde: "0.01",
  alpha: "0.05",
  power: "0.80",
  two_tailed: true,
  daily_traffic: "200",
  baseline_std: "",
};

export default function DesignPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [result, setResult] = useState<SampleSizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        metric_type: form.metric_type,
        baseline_value: parseFloat(form.baseline_value),
        mde: parseFloat(form.mde),
        alpha: parseFloat(form.alpha),
        power: parseFloat(form.power),
        two_tailed: form.two_tailed,
      };
      if (form.daily_traffic) body.daily_traffic = parseInt(form.daily_traffic);
      if (form.metric_type === "continuous" && form.baseline_std)
        body.baseline_std = parseFloat(form.baseline_std);

      const res = await api.designSampleSize(body);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const powerCurveData = result?.power_curve.map((p) => ({
    n: p.sample_size,
    power: +(p.power * 100).toFixed(1),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Experiment Designer</h1>
        <p className="text-slate-400 mt-1">
          Calculate how many users you need before running a test. Most failed
          experiments fail because they were underpowered.
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px,1fr] gap-8 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* Metric type */}
          <div>
            <label className="label">Metric Type</label>
            <select
              className="select"
              value={form.metric_type}
              onChange={(e) => set("metric_type", e.target.value)}
            >
              <option value="proportion">Proportion (Conversion Rate)</option>
              <option value="continuous">Continuous (Revenue, Time)</option>
            </select>
          </div>

          {/* Baseline */}
          <div>
            <label className="label">
              {form.metric_type === "proportion"
                ? "Baseline Conversion Rate (e.g. 0.032 = 3.2%)"
                : "Baseline Mean"}
            </label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.baseline_value}
              onChange={(e) => set("baseline_value", e.target.value)}
              required
            />
          </div>

          {/* Std dev for continuous */}
          {form.metric_type === "continuous" && (
            <div>
              <label className="label">Baseline Std Dev</label>
              <input
                className="input"
                type="number"
                step="any"
                min="0.001"
                value={form.baseline_std}
                onChange={(e) => set("baseline_std", e.target.value)}
                required
              />
            </div>
          )}

          {/* MDE */}
          <div>
            <label className="label">
              Minimum Detectable Effect — absolute
              {form.metric_type === "proportion" ? " (e.g. 0.01 = +1pp)" : ""}
            </label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.mde}
              onChange={(e) => set("mde", e.target.value)}
              required
            />
          </div>

          {/* Alpha + Power side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Significance Level α</label>
              <select
                className="select"
                value={form.alpha}
                onChange={(e) => set("alpha", e.target.value)}
              >
                <option value="0.01">0.01 (1%)</option>
                <option value="0.05">0.05 (5%)</option>
                <option value="0.10">0.10 (10%)</option>
              </select>
            </div>
            <div>
              <label className="label">Power (1−β)</label>
              <select
                className="select"
                value={form.power}
                onChange={(e) => set("power", e.target.value)}
              >
                <option value="0.70">0.70 (70%)</option>
                <option value="0.80">0.80 (80%)</option>
                <option value="0.90">0.90 (90%)</option>
                <option value="0.95">0.95 (95%)</option>
              </select>
            </div>
          </div>

          {/* Test type */}
          <div>
            <label className="label">Test Type</label>
            <div className="flex gap-4 text-sm">
              {[
                { val: true, label: "Two-tailed" },
                { val: false, label: "One-tailed" },
              ].map((o) => (
                <label key={String(o.val)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tails"
                    className="accent-blue-500"
                    checked={form.two_tailed === o.val}
                    onChange={() => set("two_tailed", o.val)}
                  />
                  <span className="text-slate-300">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Daily traffic */}
          <div>
            <label className="label">
              Daily Traffic per Variant{" "}
              <span className="text-slate-600 font-normal">(optional, for duration estimate)</span>
            </label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.daily_traffic}
              onChange={(e) => set("daily_traffic", e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading && <LoadingSpinner size={16} />}
            {loading ? "Calculating…" : "Calculate Sample Size"}
          </button>
        </form>

        {/* Results */}
        <div className="space-y-6">
          {error && (
            <div className="card border-red-500/30 text-red-400 text-sm">
              ⚠ {error}
            </div>
          )}

          {result && (
            <>
              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-300"
                    >
                      <span className="shrink-0">⚠</span>
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Key numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "Per Variant",
                    value: result.sample_size_per_variant.toLocaleString(),
                    sub: "users required",
                  },
                  {
                    label: "Total",
                    value: result.total_sample_size.toLocaleString(),
                    sub: "across both groups",
                  },
                  {
                    label: "Duration",
                    value: result.estimated_days
                      ? `${result.estimated_days} days`
                      : "—",
                    sub: result.estimated_days ? "at your traffic level" : "no traffic entered",
                  },
                  {
                    label: "MDE",
                    value: `${(parseFloat(form.mde) * (form.metric_type === "proportion" ? 100 : 1)).toFixed(2)}${form.metric_type === "proportion" ? "pp" : ""}`,
                    sub: "minimum detectable effect",
                  },
                ].map((s) => (
                  <div key={s.label} className="card text-center">
                    <p className="text-2xl font-bold text-slate-100">{s.value}</p>
                    <p className="text-xs text-blue-400 font-semibold mt-0.5">
                      {s.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Power curve */}
              <div className="card">
                <h3 className="font-semibold text-slate-200 mb-1">
                  Power Curve
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  How statistical power grows with sample size. The dashed line
                  marks your target power of{" "}
                  {(parseFloat(form.power) * 100).toFixed(0)}%.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={powerCurveData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="n"
                      stroke="#475569"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                      label={{
                        value: "Sample size per variant",
                        position: "insideBottom",
                        offset: -2,
                        fill: "#64748b",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`${v}%`, "Power"]}
                      labelFormatter={(v) => `n = ${v.toLocaleString()}`}
                    />
                    <ReferenceLine
                      y={parseFloat(form.power) * 100}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      label={{
                        value: `Target ${(parseFloat(form.power) * 100).toFixed(0)}%`,
                        fill: "#f59e0b",
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      x={result.sample_size_per_variant}
                      stroke="#3b82f6"
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="power"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Concepts */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Why this matters
            </h3>
            <StatConcept
              icon="MDE"
              term="Minimum Detectable Effect"
              definition="The smallest true lift your test can reliably detect. Set this to the smallest effect that would justify shipping — not the largest you hope for."
            />
            <StatConcept
              icon="⚡"
              term="Statistical Power"
              definition="Probability of detecting a real effect when it exists. 80% is the industry standard — it means a 20% chance of missing a real winner."
            />
            <StatConcept
              icon="α"
              term="Significance Level"
              definition="Your tolerance for false positives. At α=0.05 you'll incorrectly declare a winner 5% of the time when there is no effect."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
