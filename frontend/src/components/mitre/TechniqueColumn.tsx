import { Link } from "react-router-dom";
import { TechniqueTile } from "./TechniqueTile";

export function TechniqueColumn({
  tactic,
  tiles,
}: {
  tactic: string;
  tiles: Array<{
    technique_id: string;
    technique_name: string;
    count: number;
  }>;
}) {
  return (
    <div className="w-[260px] flex-shrink-0">
      {/* Header (fixed) */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-200 truncate">{tactic}</h3>
        <div className="text-[10px] text-neutral-400">{tiles.length}</div>
      </div>

      {/* Scroll area */}
      <div className="h-[70vh] overflow-y-auto pr-1 space-y-2">
        {tiles.map((t) => (
          <div key={t.technique_id}>
            <TechniqueTile tile={t} />

            {/* clickable alert count */}
            <div className="mt-1 flex justify-end">
              <Link
                to={`/mitre/technique/${encodeURIComponent(t.technique_id)}`}
                className="text-[10px] text-sky-400 hover:underline"
              >
                {t.count} alert{t.count !== 1 ? "s" : ""}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}