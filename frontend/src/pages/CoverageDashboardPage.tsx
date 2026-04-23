import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { MitreAPI } from "../api/mitre";
import { AlertsAPI } from "../api/alerts";
import { Card } from "../components/ui/Card";
import { TopTechniquesChart } from "../components/mitre/TopTechniquesChart";
import { SeverityDistributionChart } from "../components/mitre/SeverityDistributionChart";
import { ConfidenceDistributionChart } from "../components/mitre/ConfidenceDistributionChart";

export function CoverageDashboardPage() {
  const coverageQ = useQuery({
    queryKey: ["mitre", "coverage"],
    queryFn: () => MitreAPI.coverage(),
  });

  const alertsQ = useQuery({
    queryKey: ["alerts"],
    queryFn: () => AlertsAPI.list(),
  });

  const playbooksQ = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => AlertsAPI.listPlaybooks(),
  });

  const sortedTactics = useMemo(() => {
    const tactics = coverageQ.data?.tactics ?? {};
    return Object.entries(tactics).sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [coverageQ.data]);

  const maxTacticValue = useMemo(() => {
    if (sortedTactics.length === 0) return 1;
    return Number(sortedTactics[0][1]) || 1;
  }, [sortedTactics]);

  const topTechniques = useMemo(() => {
    const techniques = coverageQ.data?.techniques ?? {};
    return Object.entries(techniques)
      .map(([technique_id, count]) => ({
        technique_id,
        count: Number(count) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [coverageQ.data]);

  const severityRows = useMemo(() => {
    const alerts = alertsQ.data ?? [];
    const counts: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    alerts.forEach((a) => {
      const sev = String(a.severity ?? "unknown").toLowerCase();
      if (sev in counts) counts[sev] += 1;
      else counts.unknown += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [alertsQ.data]);

  const confidenceRows = useMemo(() => {
    const playbooks = playbooksQ.data ?? [];
    const counts: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    playbooks.forEach((p) => {
      const conf = String(p.confidence ?? "low").toLowerCase();
      if (conf in counts) counts[conf] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [playbooksQ.data]);

  const playbookAlertRatio = useMemo(() => {
    const alerts = alertsQ.data?.length ?? 0;
    const playbooks = playbooksQ.data?.length ?? 0;
    if (alerts === 0) return 0;
    return Math.round((playbooks / alerts) * 100);
  }, [alertsQ.data, playbooksQ.data]);

  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Coverage Summary Dashboard</h1>
          <div className="text-sm text-neutral-400">
            Evidence-based MITRE ATT&CK coverage derived from alerts with generated playbooks
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="text-sm text-neutral-300 leading-relaxed">
          This dashboard summarizes operational MITRE coverage based on
          <span className="text-neutral-100 font-medium"> playbook-backed alerts</span>.
          Techniques are only counted when a remediation playbook exists, which makes the coverage more realistic than alert-only reporting.
        </div>
      </div>

      {coverageQ.isLoading || alertsQ.isLoading || playbooksQ.isLoading ? (
        <div className="mt-6 text-neutral-400">Loading coverage metrics...</div>
      ) : coverageQ.error ? (
        <div className="mt-6 text-red-500">
          Failed to load coverage summary. Make sure backend is running.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">
                Covered Techniques
              </div>
              <div className="mt-2 text-2xl font-semibold text-neutral-100">
                {coverageQ.data?.totals?.covered_techniques ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">
                Total Techniques
              </div>
              <div className="mt-2 text-2xl font-semibold text-neutral-100">
                {coverageQ.data?.totals?.total_techniques ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">
                Coverage %
              </div>
              <div className="mt-2 text-2xl font-semibold text-sky-400">
                {coverageQ.data?.totals?.coverage_pct ?? 0}%
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">
                Playbooks
              </div>
              <div className="mt-2 text-2xl font-semibold text-neutral-100">
                {coverageQ.data?.playbook_count ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">
                Alerts Used
              </div>
              <div className="mt-2 text-2xl font-semibold text-neutral-100">
                {coverageQ.data?.alert_count_used ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">
                Playbook / Alert Ratio
              </div>
              <div className="mt-2 text-2xl font-semibold text-emerald-400">
                {playbookAlertRatio}%
              </div>
            </div>
          </div>

          {/* Tactic Distribution + Table */}
          <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="text-sm font-semibold text-neutral-200">
                Tactic Distribution
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Number of playbook-backed alert mappings contributing to each tactic
              </div>

              <div className="mt-5 space-y-4">
                {sortedTactics.length === 0 ? (
                  <div className="text-sm text-neutral-400">
                    No tactic coverage data available yet.
                  </div>
                ) : (
                  sortedTactics.map(([tactic, value]) => {
                    const numericValue = Number(value) || 0;
                    const pct = Math.max(4, (numericValue / maxTacticValue) * 100);

                    return (
                      <div key={tactic}>
                        <div className="flex items-center justify-between text-xs text-neutral-300 mb-1">
                          <span className="truncate pr-3">{tactic}</span>
                          <span className="text-neutral-400">{numericValue}</span>
                        </div>

                        <div className="h-3 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="text-sm font-semibold text-neutral-200">
                Tactic Summary Table
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Ranked by current evidence-based contribution
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs text-neutral-400 uppercase">
                    <tr>
                      <th className="pb-2 pr-4">Tactic</th>
                      <th className="pb-2 pr-4">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTactics.map(([tactic, value]) => (
                      <tr key={tactic} className="border-t border-neutral-800">
                        <td className="py-3 pr-4 text-neutral-200">{tactic}</td>
                        <td className="py-3 pr-4 text-neutral-300">{String(value)}</td>
                      </tr>
                    ))}

                    {sortedTactics.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 text-neutral-400 text-sm">
                          No tactic data available.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Top Techniques */}
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="text-sm font-semibold text-neutral-200">
              Top Techniques by Alert Frequency
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Most frequently observed MITRE techniques contributing to playbook-backed coverage
            </div>

            <div className="mt-5">
              {topTechniques.length === 0 ? (
                <div className="text-sm text-neutral-400">
                  No technique frequency data available yet.
                </div>
              ) : (
                <TopTechniquesChart rows={topTechniques} />
              )}
            </div>
          </div>

          {/* Severity + Confidence Charts */}
          <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="text-sm font-semibold text-neutral-200">
                Alert Severity Distribution
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Distribution of stored alerts by severity level
              </div>

              <div className="mt-5">
                <SeverityDistributionChart rows={severityRows} />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="text-sm font-semibold text-neutral-200">
                Playbook Confidence Distribution
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Quality distribution based on retrieved knowledge similarity
              </div>

              <div className="mt-5">
                <ConfidenceDistributionChart rows={confidenceRows} />
              </div>
            </div>
          </div>

          {/* Interpretation */}
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="text-sm font-semibold text-neutral-200">
              Coverage Interpretation
            </div>
            <div className="mt-3 text-sm text-neutral-300 leading-relaxed space-y-3">
              <p>
                The coverage percentage reflects the proportion of MITRE ATT&CK techniques
                that have been observed in alerts
                <span className="text-neutral-100 font-medium"> and </span>
                are backed by generated remediation playbooks.
              </p>
              <p>
                A higher number of covered techniques suggests broader operational readiness,
                but coverage quality should also be interpreted alongside playbook confidence,
                tactic distribution, severity distribution, and the relevance of detections to the intended SOC use case.
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}