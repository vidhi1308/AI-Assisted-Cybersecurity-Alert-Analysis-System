import React, { useMemo } from "react";
import type { MitreHeatmapResponse, HeatmapTacticGroup } from "../../types/mitre";
import { TechniqueColumn } from "./TechniqueColumn";
import type { TimeWindow } from "./HeatmapControls";
import type { NormalizedAlert } from "../../types/alert";
import type { PlaybookRecord } from "../../types/playbook";

function windowStart(timeWindow: TimeWindow): number | null {
  const now = Date.now();
  if (timeWindow === "all") return null;
  if (timeWindow === "24h") return now - 24 * 60 * 60 * 1000;
  if (timeWindow === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  return now - 30 * 24 * 60 * 60 * 1000;
}

export function HeatmapGrid({
  data,
  showOnlyCovered,
  timeWindow,
  alerts,
  playbooks,
}: {
  data: MitreHeatmapResponse | null;
  showOnlyCovered: boolean;
  timeWindow: TimeWindow;
  alerts: NormalizedAlert[];
  playbooks: PlaybookRecord[];
}) {
  if (!data) return <div className="text-sm text-neutral-400">No heatmap data.</div>;

  // playbook-backed alert IDs
  const pbAlertIds = useMemo(() => new Set(playbooks.map((p) => p.alert_id)), [playbooks]);

  // Filter alerts by time window AND only those with playbooks (evidence)
  const startMs = windowStart(timeWindow);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (!pbAlertIds.has(a.alert_id)) return false;
      const ts = new Date(a.timestamp).getTime();
      if (!Number.isFinite(ts)) return false;
      if (startMs === null) return true;
      return ts >= startMs;
    });
  }, [alerts, pbAlertIds, startMs]);

  // Build counts by technique from filtered playbook-backed alerts
  const countsByTech = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of filteredAlerts) {
      const raw: any = a.raw_event || {};
      const techs = raw.techniques || raw.relevantTechniques || [];
      const list: string[] = Array.isArray(techs)
        ? techs.map((x: any) => String(x).trim())
        : typeof techs === "string"
        ? techs.split(",").map((s) => s.trim())
        : [];

      for (const tid of list) {
        if (!tid) continue;
        m.set(tid, (m.get(tid) ?? 0) + 1);
      }
    }
    return m;
  }, [filteredAlerts]);

  // Apply counts to tiles and optionally hide 0 tiles
  const tacticsOut = useMemo(() => {
    const out: HeatmapTacticGroup[] = (data.tactics || []).map((g) => {
      const tiles = (g.tiles || []).map((t) => ({
        ...t,
        count: countsByTech.get(t.technique_id) ?? 0,
      }));
      const filtered = showOnlyCovered ? tiles.filter((t) => t.count > 0) : tiles;
      return { ...g, tiles: filtered };
    });
    return out;
  }, [data.tactics, countsByTech, showOnlyCovered]);

  // Totals for current filter window
  const coveredNow = useMemo(() => {
    let c = 0;
    countsByTech.forEach((v) => {
      if (v > 0) c += 1;
    });
    return c;
  }, [countsByTech]);

  const coveragePctNow =
    data.totals.total_techniques ? Math.round((coveredNow / data.totals.total_techniques) * 10000) / 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards (dynamic) */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-xs text-neutral-400">Covered techniques</div>
          <div className="text-lg font-semibold">{coveredNow}</div>
          <div className="text-[11px] text-neutral-500 mt-1">
            within selected time window
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-xs text-neutral-400">Total techniques</div>
          <div className="text-lg font-semibold">{data.totals.total_techniques}</div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-xs text-neutral-400">Coverage %</div>
          <div className="text-lg font-semibold">{coveragePctNow}%</div>
          <div className="text-[11px] text-neutral-500 mt-1">
            playbook-driven evidence
          </div>
        </div>
      </div>

      {/* Horizontal tactics */}
      <div className="overflow-x-auto">
        <div className="flex items-start gap-4 py-3 px-1">
          {tacticsOut.map((group) => (
            <TechniqueColumn key={group.tactic} tactic={group.tactic} tiles={group.tiles as any} />
          ))}
        </div>
      </div>
    </div>
  );
}