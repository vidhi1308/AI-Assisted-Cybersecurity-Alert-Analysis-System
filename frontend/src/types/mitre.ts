export type HeatmapTile = {
  technique_id: string;
  technique_name: string;
  count: number;
  coverage_level: "high" | "medium" | "low" | "none";
};

export type HeatmapTacticGroup = {
  tactic: string;
  tiles: HeatmapTile[];
};

export type MitreHeatmapResponse = {
  based_on: "playbooks";
  totals: {
    covered_techniques: number;
    total_techniques: number;
    coverage_pct: number;
  };
  tactics: HeatmapTacticGroup[];
};