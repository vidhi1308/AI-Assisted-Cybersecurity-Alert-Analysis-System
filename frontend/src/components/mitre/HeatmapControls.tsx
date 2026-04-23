import { downloadCsv } from "../../utils/csv";

export type TimeWindow = "24h" | "7d" | "30d" | "all";

export function HeatmapControls({
  showOnlyCovered,
  setShowOnlyCovered,
  timeWindow,
  setTimeWindow,
  exportRows,
}: {
  showOnlyCovered: boolean;
  setShowOnlyCovered: (v: boolean) => void;
  timeWindow: TimeWindow;
  setTimeWindow: (v: TimeWindow) => void;
  exportRows: Array<Record<string, any>>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Toggle */}
      <label className="flex items-center gap-2 text-xs text-neutral-300">
        <input
          type="checkbox"
          checked={showOnlyCovered}
          onChange={(e) => setShowOnlyCovered(e.target.checked)}
        />
        Show only covered techniques
      </label>

      {/* Time filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400">Time:</span>
        <select
          value={timeWindow}
          onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
          className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-neutral-200"
        >
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Export */}
      <button
        onClick={() => downloadCsv("mitre_coverage.csv", exportRows)}
        className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200"
      >
        Export CSV
      </button>
    </div>
  );
}