"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ExperimentSummary } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatConcept from "@/components/StatConcept";

const QUICK_LINKS = [
  {
    href: "/design",
    icon: "📐",
    title: "Experiment Designer",
    desc: "Calculate sample size and power before you launch.",
    color: "border-blue-500/40 hover:border-blue-500/80",
  },
  {
    href: "/analyze",
    icon: "🔬",
    title: "Results Analyzer",
    desc: "Enter results and run the correct statistical test.",
    color: "border-purple-500/40 hover:border-purple-500/80",
  },
  {
    href: "/monitor",
    icon: "📡",
    title: "Sequential Monitor",
    desc: "See why peeking at p-values breaks your experiment.",
    color: "border-amber-500/40 hover:border-amber-500/80",
  },
];

const VERDICT_LABELS: Record<string, string> = {
  ship: "Ship It",
  ship_with_caution: "Ship w/ Caution",
  dont_ship: "Don't Ship",
  needs_more_data: "Needs More Data",
};

const STATUS_ORDER = ["significant", "not_significant", "inconclusive"];

export default function HomePage() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listExperiments()
      .then(setExperiments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
      {/* Hero */}
      <section className="text-center space-y-4 py-6">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          ⚗ Statistical Experimentation Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 tracking-tight">
          Rigorous A/B Testing,{" "}
          <span className="text-blue-500">end-to-end</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Design experiments with proper power analysis, analyse results with
          correct statistical tests, and understand why the peeking problem
          destroys your false positive rate.
        </p>
      </section>

      {/* Quick-launch cards */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Tools
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`card border-2 transition-colors group ${l.color}`}
            >
              <div className="text-3xl mb-3">{l.icon}</div>
              <p className="font-semibold text-slate-100 group-hover:text-white">
                {l.title}
              </p>
              <p className="text-sm text-slate-400 mt-1">{l.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Experiment library */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Sample Experiment Library
        </h2>
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 py-8">
            <LoadingSpinner />
            Loading experiments…
          </div>
        )}
        {error && (
          <div className="card border-red-500/30 text-red-400 text-sm">
            ⚠ Could not load experiments — is the backend running?
            <br />
            <span className="text-slate-500 text-xs">{error}</span>
          </div>
        )}
        {!loading && !error && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {experiments.map((exp) => (
              <Link
                key={exp.id}
                href={`/experiments/${exp.id}`}
                className="card hover:border-slate-600 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    {exp.type}
                  </span>
                  <StatusBadge status={exp.status} />
                </div>
                <p className="font-semibold text-slate-100 group-hover:text-white leading-snug">
                  {exp.name}
                </p>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                  {exp.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Verdict:{" "}
                    <span className="text-slate-300">
                      {VERDICT_LABELS[exp.verdict] ?? exp.verdict}
                    </span>
                  </span>
                  <span className="text-blue-500 text-xs group-hover:underline">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Statistical concepts */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Statistical Concepts
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatConcept
            icon="α"
            term="Type I Error (α)"
            definition="Probability of a false positive — declaring a winner when there is no real effect. Controlled by your significance level."
          />
          <StatConcept
            icon="β"
            term="Type II Error (β)"
            definition="Probability of a false negative — missing a real effect. Equal to 1 − power. Controlled by sample size."
          />
          <StatConcept
            icon="⚡"
            term="Statistical Power"
            definition="Probability of detecting a real effect when it exists. Typically set to 80%. Higher power requires more data."
          />
          <StatConcept
            icon="p"
            term="p-value"
            definition="Probability of observing this result (or more extreme) if the null hypothesis were true. NOT the probability the hypothesis is correct."
          />
          <StatConcept
            icon="CI"
            term="Confidence Interval"
            definition="Range of plausible values for the true lift. A 95% CI that excludes zero is statistically significant."
          />
          <StatConcept
            icon="Δ"
            term="Effect Size"
            definition="Magnitude of the difference, independent of sample size. Cohen's d for continuous, Cohen's h for proportions."
          />
          <StatConcept
            icon="MDE"
            term="Minimum Detectable Effect"
            definition="Smallest lift your test can reliably detect given your sample size and power. Set this before running — not after."
          />
        </div>
      </section>
    </div>
  );
}
