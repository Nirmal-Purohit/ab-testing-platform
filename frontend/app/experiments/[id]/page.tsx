"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  AreaChart, Area, Legend,
} from "recharts";
import { api, ExperimentDetail } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusBadge from "@/components/StatusBadge";
import VerdictBanner from "@/components/VerdictBanner";

// Helpers -----------------------------------------------------------------------

function fmt(v: unknown, isRate = false): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    if (isRate) return `${(v * 100).toFixed(2)}%`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(v);
}

function liftColor(lift: number): string {
  if (lift > 0) return "text-emerald-400";
  if (lift < 0) return "text-red-400";
  return "text-slate-400";
}

function GuardrailRow({ m }: { m: Record<string, unknown> }) {
  const status = m.status as string;
  const lift = m.observed_lift_pp as number | undefined;

  return (
    <tr className="border-b border-slate-800/50">
      <td className="py-3 pr-4 text-sm text-slate-200 font-medium">{m.name as string}</td>
      <td className="py-3 pr-4 text-sm font-mono text-slate-400">
        {m.control_rate !== undefined
          ? `${((m.control_rate as number) * 100).toFixed(2)}%`
          : m.control_mean !== undefined
          ? fmt(m.control_mean)
          : "—"}
      </td>
      <td className="py-3 pr-4 text-sm font-mono text-slate-400">
        {m.treatment_rate !== undefined
          ? `${((m.treatment_rate as number) * 100).toFixed(2)}%`
          : m.treatment_mean !== undefined
          ? fmt(m.treatment_mean)
          : "—"}
      </td>
      <td className="py-3 pr-4 text-sm font-mono">
        {lift !== undefined ? (
          <span className={liftColor(lift)}>
            {lift > 0 ? "+" : ""}{lift.toFixed(2)}pp
          </span>
        ) : "—"}
      </td>
      <td className="py-3 pr-4 text-sm font-mono text-slate-400">
        {m.p_value !== undefined
          ? (m.p_value as number) < 0.001 ? "<0.001" : (m.p_value as number).toFixed(4)
          : "—"}
      </td>
      <td className="py-3">
        <StatusBadge status={status} />
      </td>
    </tr>
  );
}

// -------------------------------------------------------------------------------

export default function ExperimentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [exp, setExp] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getExperiment(id)
      .then(setExp)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center gap-3 text-slate-400 p-12 justify-center">
        <LoadingSpinner /> Loading experiment…
      </div>
    );

  if (error || !exp)
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="card border-red-500/30 text-red-400 text-sm">⚠ {error ?? "Experiment not found"}</div>
        <Link href="/" className="btn-secondary mt-4 inline-flex">← Back to Library</Link>
      </div>
    );

  const pm = exp.primary_metric;
  const isProportion = exp.type === "proportion";

  // Primary metric bar chart data
  const barData = isProportion
    ? [
        { group: "Control", value: +(((pm.control_rate as number) ?? 0) * 100).toFixed(3) },
        { group: "Treatment", value: +(((pm.treatment_rate as number) ?? 0) * 100).toFixed(3) },
      ]
    : [
        { group: "Control", value: +(pm.control_mean as number ?? 0) },
        { group: "Treatment", value: +(pm.treatment_mean as number ?? 0) },
      ];

  const lift = pm.observed_lift_pp as number;
  const relLift = pm.relative_lift_pct as number;
  const pValue = pm.p_value as number;
  const isSignificant = pm.significant as boolean;
  const ciLower = pm.ci_lower as number;
  const ciUpper = pm.ci_upper as number;

  // Distribution overlap for proportions
  function normalPDF(x: number, mean: number, std: number) {
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);
  }

  let distData: Record<string, number>[] = [];
  if (isProportion && pm.control_rate && pm.control_n && pm.treatment_rate && pm.treatment_n) {
    const p1 = pm.control_rate as number;
    const p2 = pm.treatment_rate as number;
    const n1 = pm.control_n as number;
    const n2 = pm.treatment_n as number;
    const s1 = Math.sqrt((p1 * (1 - p1)) / n1);
    const s2 = Math.sqrt((p2 * (1 - p2)) / n2);
    const lo = Math.min(p1, p2) - 5 * Math.max(s1, s2);
    const hi = Math.max(p1, p2) + 5 * Math.max(s1, s2);
    const steps = 80;
    distData = Array.from({ length: steps }, (_, i) => {
      const x = lo + ((hi - lo) / steps) * i;
      return {
        x: +(x * 100).toFixed(4),
        control: +normalPDF(x, p1, s1).toFixed(6),
        treatment: +normalPDF(x, p2, s2).toFixed(6),
      };
    });
  }

  const VERDICT_REASONING: Record<string, string> = {
    ship: `The primary metric shows a statistically significant positive lift (${lift > 0 ? "+" : ""}${lift.toFixed(2)}${isProportion ? "pp" : ""}, p=${pValue < 0.001 ? "<0.001" : pValue.toFixed(4)}) with no guardrail violations. Safe to roll out.`,
    ship_with_caution: `The primary metric shows a significant positive lift but one or more guardrail metrics have flagged a warning. Investigate the guardrail issues before full rollout.`,
    dont_ship: `${isSignificant && lift < 0 ? `The primary metric shows a statistically significant negative lift (${lift.toFixed(2)}${isProportion ? "pp" : ""}, p=${pValue < 0.001 ? "<0.001" : pValue.toFixed(4)}). Reverting is the right call.` : "The result is not statistically significant — there is insufficient evidence of a meaningful effect. Do not ship based on inconclusive data."}`,
    needs_more_data: `The test was stopped before reaching the required sample size. The observed lift is directionally positive but statistically inconclusive. Restart the test and run it to completion.`,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">Library</Link>
        <span>/</span>
        <span className="text-slate-300">{exp.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {exp.type}
            </span>
            <StatusBadge status={exp.status} />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">{exp.name}</h1>
          <p className="text-slate-400 mt-2 max-w-2xl">{exp.description}</p>
        </div>
      </div>

      {/* Hypothesis */}
      <div className="card bg-slate-800/40 border-slate-700/50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hypothesis</p>
        <p className="text-sm text-slate-300 italic">"{exp.hypothesis}"</p>
      </div>

      {/* Verdict */}
      <VerdictBanner
        verdict={exp.verdict}
        reasoning={VERDICT_REASONING[exp.verdict] ?? exp.interpretation}
      />

      {/* Primary metric overview */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Primary Metric — {pm.name as string}
        </h2>
        <div className="grid lg:grid-cols-[1fr,320px] gap-6">
          {/* Stats */}
          <div className="space-y-4">
            {/* Key numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Observed Lift",
                  value: `${lift > 0 ? "+" : ""}${lift.toFixed(2)}${isProportion ? "pp" : ""}`,
                  color: liftColor(lift),
                },
                {
                  label: "Relative Lift",
                  value: `${relLift > 0 ? "+" : ""}${relLift.toFixed(1)}%`,
                  color: liftColor(relLift),
                },
                {
                  label: "p-value",
                  value: pValue < 0.001 ? "<0.001" : pValue.toFixed(4),
                  color: isSignificant ? "text-emerald-400" : "text-slate-300",
                },
                {
                  label: "Effect Size",
                  value: fmt(
                    pm.effect_size_cohens_h ?? pm.effect_size_cohens_d
                  ),
                  color: "text-slate-300",
                },
              ].map((s) => (
                <div key={s.label} className="card-sm text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CI */}
            <div className="card bg-slate-800/40 border-slate-700/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                95% Confidence Interval on Lift
              </p>
              <div className="flex items-center gap-4">
                <span className={`text-lg font-mono font-bold ${liftColor(ciLower)}`}>
                  {ciLower > 0 ? "+" : ""}{ciLower.toFixed(3)}{isProportion ? "pp" : ""}
                </span>
                <div className="flex-1 h-2 bg-slate-700 rounded relative">
                  {/* zero line */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-500"
                    style={{ left: `${((-ciLower) / (ciUpper - ciLower)) * 100}%` }} />
                  {/* CI bar */}
                  <div
                    className={`absolute top-0 bottom-0 rounded ${isSignificant ? "bg-emerald-500/50" : "bg-slate-500/50"}`}
                    style={{ left: 0, right: 0 }}
                  />
                </div>
                <span className={`text-lg font-mono font-bold ${liftColor(ciUpper)}`}>
                  {ciUpper > 0 ? "+" : ""}{ciUpper.toFixed(3)}{isProportion ? "pp" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isSignificant
                  ? ciLower > 0
                    ? "CI entirely above zero — positive effect confirmed."
                    : "CI entirely below zero — negative effect confirmed."
                  : "CI crosses zero — effect not statistically distinguishable from noise."}
              </p>
            </div>

            {/* Interpretation */}
            <div className="card bg-slate-800/40 border-slate-700/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Statistical Interpretation
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {pm.interpretation as string}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card">
            <p className="text-sm font-semibold text-slate-300 mb-3">
              {isProportion ? "Conversion Rate" : "Mean Value"} Comparison
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="group" stroke="#475569" tick={{ fontSize: 12 }} />
                <YAxis
                  stroke="#475569"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => isProportion ? `${v}%` : v}
                  domain={[
                    Math.min(...barData.map((d) => d.value)) * 0.95,
                    Math.max(...barData.map((d) => d.value)) * 1.05,
                  ]}
                />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}${isProportion ? "%" : ""}`, "Value"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "#64748b" : isSignificant ? (lift > 0 ? "#10b981" : "#ef4444") : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {distData.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-5 mb-3">
                  Sampling Distribution Overlap
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={distData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis dataKey="x" stroke="#475569" tick={{ fontSize: 9 }}
                      tickFormatter={(v) => `${(+v).toFixed(1)}%`} />
                    <YAxis stroke="#475569" tick={false} />
                    <Area type="monotone" dataKey="control" stroke="#64748b" fill="#64748b" fillOpacity={0.3}
                      strokeWidth={1.5} name="Control" />
                    <Area type="monotone" dataKey="treatment" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3}
                      strokeWidth={1.5} name="Treatment" />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Guardrail metrics */}
      {exp.guardrail_metrics.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Guardrail Metrics
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Metric</th>
                  <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Control</th>
                  <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Treatment</th>
                  <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Lift</th>
                  <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">p-value</th>
                  <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {exp.guardrail_metrics.map((m, i) => (
                  <GuardrailRow key={i} m={m} />
                ))}
              </tbody>
            </table>
            {/* Notes */}
            <div className="mt-4 space-y-2">
              {exp.guardrail_metrics
                .filter((m) => m.note)
                .map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs px-3 py-2 rounded-lg ${
                      m.status === "warning"
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        : "bg-slate-800/50 text-slate-400"
                    }`}
                  >
                    {m.note as string}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Multi-metric summary table */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Full Metrics Summary
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-800">
                <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Metric</th>
                <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Role</th>
                <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Lift</th>
                <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">p-value</th>
                <th className="pb-3 text-xs text-slate-500 font-semibold uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/50">
                <td className="py-3 pr-4 text-sm text-slate-200 font-medium">{pm.name as string}</td>
                <td className="py-3 pr-4">
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Primary</span>
                </td>
                <td className={`py-3 pr-4 text-sm font-mono font-bold ${liftColor(lift)}`}>
                  {lift > 0 ? "+" : ""}{lift.toFixed(2)}{isProportion ? "pp" : ""}
                </td>
                <td className="py-3 pr-4 text-sm font-mono text-slate-400">
                  {pValue < 0.001 ? "<0.001" : pValue.toFixed(4)}
                </td>
                <td className="py-3">
                  <StatusBadge status={isSignificant ? (lift > 0 ? "win" : "loss") : "not_significant"} />
                </td>
              </tr>
              {exp.guardrail_metrics.map((m, i) => {
                const gLift = m.observed_lift_pp as number | undefined;
                const gP = m.p_value as number | undefined;
                const gStatus = m.status as string;
                return (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="py-3 pr-4 text-sm text-slate-200 font-medium">{m.name as string}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full">Guardrail</span>
                    </td>
                    <td className={`py-3 pr-4 text-sm font-mono ${gLift !== undefined ? liftColor(gLift) : "text-slate-500"}`}>
                      {gLift !== undefined ? `${gLift > 0 ? "+" : ""}${gLift.toFixed(2)}pp` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-sm font-mono text-slate-400">
                      {gP !== undefined ? (gP < 0.001 ? "<0.001" : gP.toFixed(4)) : "—"}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={gStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interpretation + Lessons */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card bg-slate-800/40 border-slate-700/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Interpretation</p>
          <p className="text-sm text-slate-300 leading-relaxed">{exp.interpretation}</p>
        </div>
        <div className="card bg-slate-800/40 border-slate-700/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lessons Learned</p>
          <p className="text-sm text-slate-300 leading-relaxed">{exp.lessons}</p>
        </div>
      </div>

      {/* Back */}
      <Link href="/" className="btn-secondary inline-flex">
        ← Back to Library
      </Link>
    </div>
  );
}
