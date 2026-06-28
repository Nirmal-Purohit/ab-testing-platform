interface Props {
  term: string;
  definition: string;
  icon?: string;
}

export default function StatConcept({ term, definition, icon = "ℹ" }: Props) {
  return (
    <div className="stat-concept flex gap-3">
      <span className="text-blue-400 text-base shrink-0 mt-0.5">{icon}</span>
      <div>
        <span className="text-xs font-semibold text-slate-300">{term}: </span>
        <span className="text-xs text-slate-400">{definition}</span>
      </div>
    </div>
  );
}
