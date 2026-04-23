export type PlaybookAction = {
  action: string;
  reason?: string;
  priority: "high" | "medium" | "low";
};

export type PlaybookJSON = {
  what_happened: string;
  associated_risk: string;
  recommended_actions: PlaybookAction[];
};

export type PlaybookSource = {
  id?: number | string;
  source?: string;
  text?: string;
  score?: number;
};

export type PlaybookRecord = {
  playbook_id: number;
  alert_id: string;
  created_at: string;
  model: string;
  playbook: PlaybookJSON;
  sources: PlaybookSource[];
  confidence: "high" | "medium" | "low";
};