import { apiGet, apiPost } from "./http";
import type { NormalizedAlert } from "../types/alert";
import type { PlaybookRecord } from "../types/playbook";

export const AlertsAPI = {
  list: () => apiGet<NormalizedAlert[]>("/alerts"),
  get: (alertId: string) => apiGet<NormalizedAlert>(`/alerts/${encodeURIComponent(alertId)}`),

  getPlaybook: (alertId: string) =>
    apiGet<PlaybookRecord>(`/alerts/${encodeURIComponent(alertId)}/playbook`),

  generatePlaybook: (alertId: string) =>
    apiPost<PlaybookRecord>(`/alerts/${encodeURIComponent(alertId)}/generate-playbook`),

  listPlaybooks: () => apiGet<PlaybookRecord[]>("/playbooks"),
};