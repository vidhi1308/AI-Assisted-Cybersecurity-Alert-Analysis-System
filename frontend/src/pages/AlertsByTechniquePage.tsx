import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AlertsAPI } from "../api/alerts";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import type { PlaybookRecord } from "../types/playbook";

export function AlertsByTechniquePage() {
  const { techId } = useParams<{ techId: string }>();
  const alertsQ = useQuery({ queryKey: ["alerts"], queryFn: () => AlertsAPI.list() });

  // fetch all playbooks once (small dataset for demo)
  const pbsQ = useQuery({ queryKey: ["playbooks"], queryFn: () => AlertsAPI.listPlaybooks() });

  const alerts = alertsQ.data ?? [];
  const pbs = pbsQ.data ?? [];

  // Map playbooks by alert_id
  const pbByAlert = useMemo(() => {
    const m = new Map<string, PlaybookRecord>();
    (pbs as PlaybookRecord[]).forEach((p) => {
      if (p?.alert_id) m.set(p.alert_id, p);
    });
    return m;
  }, [pbs]);

  // Filter alerts that reference this technique (raw_event.techniques includes)
  const matchingAlerts = useMemo(() => {
    if (!techId) return [];
    return alerts.filter((a) => {
      const raw = (a.raw_event as any) || {};
      const techs = raw.techniques || raw.relevantTechniques || [];
      if (Array.isArray(techs)) return techs.map(String).map(t => t.trim()).includes(techId);
      if (typeof techs === "string") return techs.split(",").map(s => s.trim()).includes(techId);
      return false;
    });
  }, [alerts, techId]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Alerts for technique {techId}</h1>
          <div className="text-sm text-neutral-400">
            Showing {matchingAlerts.length} alert(s) that reference this MITRE technique.
          </div>
        </div>
        <div>
          <Link to="/mitre" className="text-sm text-sky-400 hover:underline">Back to heatmap</Link>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {matchingAlerts.length === 0 && <div className="text-sm text-neutral-400">No alerts found for this technique.</div>}

        {matchingAlerts.map((a) => {
          const pb = pbByAlert.get(a.alert_id);
          return (
            <div key={a.alert_id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-neutral-400">{a.rule_name} • {new Date(a.timestamp).toLocaleString()}</div>
                  <div className="text-xs text-neutral-300 mt-2">
                    User: {a.username ?? "-"} • Src IP: {a.src_ip ?? "-"} • Host: {a.hostname ?? "-"}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  {pb ? (
                    <>
                      <div className="text-xs text-neutral-400">Playbook</div>
                      <Link to={`/alerts/${encodeURIComponent(a.alert_id)}`} className="text-sky-400 hover:underline text-sm">View playbook</Link>
                      <Badge tone={pb.confidence === "high" ? "high" : pb.confidence === "medium" ? "medium" : "low"}>{pb.confidence}</Badge>
                    </>
                  ) : (
                    <div className="text-sm text-neutral-400">No playbook</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}