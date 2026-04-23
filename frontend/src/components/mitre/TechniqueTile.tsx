import clsx from "clsx";

function getBlueGradient(count: number) {
  if (count === 0) return "bg-neutral-900 text-neutral-500";
  if (count === 1) return "bg-blue-950 text-white";
  if (count === 2) return "bg-blue-900 text-white";
  if (count === 3) return "bg-blue-800 text-white";
  if (count === 4) return "bg-blue-700 text-white";
  return "bg-blue-600 text-white"; // 5+
}

export function TechniqueTile({
  tile,
}: {
  tile: {
    technique_id: string;
    technique_name: string;
    count: number;
  };
}) {
  return (
    <div
      className={clsx(
        "rounded-md border border-neutral-800 px-2 py-1",
        "hover:border-neutral-600 transition",
        getBlueGradient(tile.count)
      )}
      title={`${tile.technique_id} — ${tile.technique_name} (${tile.count} alerts)`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold truncate leading-4">
            {tile.technique_name}
          </div>
          <div className="text-[10px] opacity-80 leading-3">{tile.technique_id}</div>
        </div>

        <div className="text-[10px] font-bold opacity-90 shrink-0">
          {tile.count}
        </div>
      </div>
    </div>
  );
}