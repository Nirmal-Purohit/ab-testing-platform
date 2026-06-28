import clsx from "clsx";

const VERDICTS: Record<string, { bg: string; icon: string; title: string; color: string }> = {
  ship: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    icon: "🚀",
    title: "Ship It",
    color: "text-emerald-400",
  },
  ship_with_caution: {
    bg: "bg-amber-500/10 border-amber-500/30",
    icon: "⚠️",
    title: "Ship with Caution",
    color: "text-amber-400",
  },
  dont_ship: {
    bg: "bg-red-500/10 border-red-500/30",
    icon: "🛑",
    title: "Don't Ship",
    color: "text-red-400",
  },
  needs_more_data: {
    bg: "bg-blue-500/10 border-blue-500/30",
    icon: "🔍",
    title: "Needs More Data",
    color: "text-blue-400",
  },
};

interface Props {
  verdict: string;
  reasoning: string;
}

export default function VerdictBanner({ verdict, reasoning }: Props) {
  const cfg = VERDICTS[verdict] ?? VERDICTS["needs_more_data"];
  return (
    <div className={clsx("border rounded-xl p-5 flex gap-4 items-start", cfg.bg)}>
      <span className="text-2xl shrink-0">{cfg.icon}</span>
      <div>
        <p className={clsx("font-bold text-base", cfg.color)}>{cfg.title}</p>
        <p className="text-sm text-slate-300 mt-1">{reasoning}</p>
      </div>
    </div>
  );
}
