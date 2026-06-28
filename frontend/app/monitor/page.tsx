"use client";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { api, SimulateResponse } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatConcept from "@/components/StatConcept";

interface FormState {
  baseline_rate: string;
  true_effect: string;
  daily_traffic_per_variant: string;
  total_days: string;
  alpha: string;
}

const DEFAULTS: FormState = {
  baseline_rate: "0.05",
  true_effect: "0.01",
  daily_traffic_per_variant: "200",
  total_days: "30",
  alpha: "0.05",
};

export default function MonitorPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.monitorSimulate({
        baseline_rate: parseFloat(form.baseline_rate),
        true_effect: parseFloat(form.true_effect),
        daily_traffic_per_variant: parseInt(form.daily_traffic_per_variant),
        total_days: parseInt(form.total_days),
        alpha: parseFloat(form.alpha),
      });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const chartData = result
    ? result.days.map((d, i) => ({
        day: d,
        naive_p: +(result.naive_pvalues[i] * 100).toFixed(3),
        ofb_boundary: +(result.ofb_boundaries[i] * 100).toFixed(3),
        alpha_line: parseFloat(form.alpha) * 100,
      }))
    : [];

  const alpha = parseFloat(form.alpha);

  // Count how many times naive p crosses alpha
  const naiveCrossings = result
    ? result.naive_pvalues.filter((p) => p < alpha).length
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Sequential Monitoring
        </h1>
        <p className="text-slate-400 mt-1 max-w-2xl">
          Demonstrates the peeking problem — one of the most common mistakes in
          industry experimentation. See what happens to your false positive rate
          when you check p-values daily and stop early.
        </p>
      </div>

      {/* Explainer */}
      <div className="card bg-amber-500/5 border-amber-500/20 space-y-2">
        <p className="font-semibold text-amber-400 flex items-center gap-2">
          <span>⚠</span> The Peeking Problem
        </p>
        <p className="text-sm text-slate-400 leading-relaxed">
          If you run a 30-day experiment, peek at the p-value every day, and
          stop whenever p&nbsp;&lt;&nbsp;0.05 — your actual false positive rate
          isn't 5%. It's closer to{" "}
          <span className="text-amber-300 font-semibold">20–30%</span>. You'll
          declare winners that don't exist. The O'Brien-Fleming spending
          boundary fixes this by setting a stricter threshold early in the
          experiment and relaxing it over time.
        </p>
      </div>

      <div className="grid lg:grid-cols-[320px,1fr] gap-8 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">Baseline Rate (e.g. 0.05 = 5%)</label>
            <input className="input" type="number" step="any" min="0.001" max="0.999"
              value={form.baseline_rate} onChange={(e) => set("baseline_rate", e.target.value)} required />
          </div>
          <div>
            <label className="label">True Effect (absolute lift, 0 = null hypothesis)</label>
            <input className="input" type="number" step="any"
              value={form.true_effect} onChange={(e) => set("true_effect", e.target.value)} required />
            <p className="text-xs text-slate-600 mt-1">
              Set to 0 to simulate under the null (no real effect).
            </p>
          </div>
          <div>
            <label className="label">Daily Traffic per Variant</label>
            <input className="input" type="number" min="10"
              value={form.daily_traffic_per_variant}
              onChange={(e) => set("daily_traffic_per_variant", e.target.value)} required />
          </div>
          <div>
            <label className="label">Total Days</label>
            <input className="input" type="number" min="2" max="120"
              value={form.total_days} onChange={(e) => set("total_days", e.target.value)} required />
          </div>
          <div>
            <label className="label">Significance Level α</label>
            <select className="select" value={form.alpha} onChange={(e) => set("alpha", e.target.value)}>
              <option value="0.01">0.01</option>
              <option value="0.05">0.05</option>
              <option value="0.10">0.10</option>
            </select>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading && <LoadingSpinner size={16} />}
            {loading ? "Simulating…" : "Run Simulation"}
          </button>
        </form>

        {/* Results */}
        <div className="space-y-6">
          {error && (
            <div className="card border-red-500/30 text-red-400 text-sm">⚠ {error}</div>
          )}

          {result && (
            <>
              {/* FPR cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card text-center border-red-500/20">
                  <p className="text-2xl font-bold text-red-400">
                    {(result.false_positive_rate_naive * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Naive Peeking FPR</p>
                  <p className="text-xs text-red-500/70 mt-0.5">Expected: ~{(alpha * 100).toFixed(0)}%</p>
                </div>
                <div className="card text-center border-emerald-500/20">
                  <p className="text-2xl font-bold text-emerald-400">
                    {(result.false_positive_rate_sequential * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Sequential (O'B-F) FPR</p>
                  <p className="text-xs text-emerald-500/70 mt-0.5">Target: ≤{(alpha * 100).toFixed(0)}%</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-slate-200">
                    {result.safe_stop_day ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Safe Stop Day</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {result.safe_stop_day
                      ? "Sequential boundary crossed"
                      : "No crossing detected"}
                  </p>
                </div>
                <div className="card text-center border-amber-500/20">
                  <p className="text-2xl font-bold text-amber-400">
                    {naiveCrossings}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Naive False Stops</p>
                  <p className="text-xs text-slate-600 mt-0.5">Days where p &lt; α naively</p>
                </div>
              </div>

              {/* Chart */}
              <div className="card">
                <h3 className="font-semibold text-slate-200 mb-1">
                  p-value Over Time
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Red line = naive p-value. Blue line = O'Brien-Fleming safe
                  stopping boundary. The naive line can drop below the flat
                  α={form.alpha} threshold many times — each one would be a
                  false positive if you stopped there.
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="day"
                      stroke="#475569"
                      tick={{ fontSize: 11 }}
                      label={{ value: "Day", position: "insideBottom", offset: -10, fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, Math.min(100, (alpha * 100 * 3))]}
                    />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, name: string) => [
                        `${v.toFixed(3)}%`,
                        name === "naive_p"
                          ? "Naive p-value"
                          : name === "ofb_boundary"
                          ? "O'B-F Boundary"
                          : "α threshold",
                      ]}
                      labelFormatter={(v) => `Day ${v}`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      formatter={(v) =>
                        v === "naive_p"
                          ? "Naive p-value"
                          : v === "ofb_boundary"
                          ? "O'B-F Safe Boundary"
                          : "α threshold"
                      }
                    />
                    {/* Flat alpha reference */}
                    <ReferenceLine y={alpha * 100} stroke="#f59e0b" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="naive_p" stroke="#ef4444" strokeWidth={2}
                      dot={false} activeDot={{ r: 3 }} />
                    <Line type="monotone" dataKey="ofb_boundary" stroke="#3b82f6" strokeWidth={2}
                      dot={false} strokeDasharray="6 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Day-by-day table */}
              <div className="card overflow-x-auto">
                <h3 className="font-semibold text-slate-200 mb-3 text-sm">
                  Daily Status
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-slate-800">
                      <th className="pb-2 text-slate-500">Day</th>
                      <th className="pb-2 text-slate-500">Naive p</th>
                      <th className="pb-2 text-slate-500">O'B-F boundary</th>
                      <th className="pb-2 text-slate-500">Naive status</th>
                      <th className="pb-2 text-slate-500">Sequential status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.days.map((d, i) => {
                      const naive = result.naive_pvalues[i];
                      const boundary = result.ofb_boundaries[i];
                      const naiveSig = naive < alpha;
                      const seqSig = naive < boundary;
                      return (
                        <tr
                          key={d}
                          className={`border-b border-slate-800/50 ${
                            d === result.safe_stop_day
                              ? "bg-blue-500/5"
                              : naiveSig
                              ? "bg-red-500/5"
                              : ""
                          }`}
                        >
                          <td className="py-1.5 font-mono text-slate-300">{d}</td>
                          <td className={`py-1.5 font-mono ${naiveSig ? "text-red-400" : "text-slate-400"}`}>
                            {naive < 0.001 ? "<0.001" : naive.toFixed(4)}
                          </td>
                          <td className="py-1.5 font-mono text-blue-400">
                            {boundary < 0.001 ? "<0.001" : boundary.toFixed(4)}
                          </td>
                          <td className="py-1.5">
                            {naiveSig ? (
                              <span className="badge-loss text-[10px] py-0.5">Stop ⚠</span>
                            ) : (
                              <span className="badge-neutral text-[10px] py-0.5">Continue</span>
                            )}
                          </td>
                          <td className="py-1.5">
                            {seqSig ? (
                              <span className="badge-win text-[10px] py-0.5">Safe stop ✓</span>
                            ) : (
                              <span className="badge-neutral text-[10px] py-0.5">Keep running</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Concepts */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Key concepts</h3>
            <StatConcept icon="α"
              term="Alpha Spending"
              definition="A framework that distributes the total allowed Type I error across multiple looks. You 'spend' alpha at each peek, leaving less for later looks." />
            <StatConcept icon="🔒"
              term="O'Brien-Fleming Boundary"
              definition="A conservative alpha spending function that sets a very strict threshold early (when little data exists) and relaxes toward α at the end." />
            <StatConcept icon="⚠"
              term="Peeking Problem"
              definition="Repeatedly checking p-values and stopping when p<α inflates your false positive rate far above α. The sequential boundary corrects this." />
          </div>
        </div>
      </div>
    </div>
  );
}
