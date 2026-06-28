import clsx from "clsx";

type Status = "win" | "loss" | "neutral" | "warning" | "inconclusive" | "not_significant" | "significant" | string;

const MAP: Record<string, { cls: string; label: string; icon: string }> = {
  win:             { cls: "badge-win",          label: "Win",          icon: "✓" },
  significant:     { cls: "badge-win",          label: "Significant",  icon: "✓" },
  loss:            { cls: "badge-loss",         label: "Loss",         icon: "✗" },
  not_significant: { cls: "badge-neutral",      label: "Not Significant", icon: "—" },
  neutral:         { cls: "badge-neutral",      label: "Neutral",      icon: "—" },
  warning:         { cls: "badge-warning",      label: "Warning",      icon: "⚠" },
  inconclusive:    { cls: "badge-inconclusive", label: "Inconclusive", icon: "?" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = MAP[status] ?? { cls: "badge-neutral", label: status, icon: "—" };
  return (
    <span className={cfg.cls}>
      {cfg.icon} {cfg.label}
    </span>
  );
}
