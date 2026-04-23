import { apiGet, apiPost } from "./http";
import type { DetectionListResponse } from "../types/detection";
import type { NormalizedAlert } from "../types/alert";

export const DetectionsAPI = {
  list: () => apiGet<DetectionListResponse>("/detections"),

  generateAndSave: (detectionId: string) =>
    apiPost<NormalizedAlert>(`/detections/${encodeURIComponent(detectionId)}/generate-and-save`),
};