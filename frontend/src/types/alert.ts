export type NormalizedAlert = {
  alert_id: string;
  title: string;
  timestamp: string;
  severity: string;

  src_ip?: string | null;
  username?: string | null;
  hostname?: string | null;

  rule_name?: string | null;
  attributes?: Record<string, unknown>;
  raw_event?: Record<string, unknown>;
};