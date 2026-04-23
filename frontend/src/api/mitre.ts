import { apiGet } from "./http";
import type { MitreHeatmapResponse } from "../types/mitre";

export const MitreAPI = {
  heatmap: () => apiGet<MitreHeatmapResponse>("/mitre/heatmap"),
  coverage: () => apiGet<any>("/mitre/coverage"),
};