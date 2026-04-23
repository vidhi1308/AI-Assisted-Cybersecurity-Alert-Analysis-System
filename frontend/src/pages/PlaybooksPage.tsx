import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { AlertsAPI } from "../api/alerts";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import type { PlaybookRecord } from "../types/playbook";

function confidenceTone(c: string): "high" | "medium" | "low" {
  if (c === "high") return "high";
  if (c === "medium") return "medium";
  return "low";
}

export function PlaybooksPage() {
  const [q, setQ] = useState("");
  const [confidence, setConfidence] = useState<"all" | "high" | "medium" | "low">("all");

  const playbooksQ = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => AlertsAPI.listPlaybooks(),
  });

  const filtered = useMemo(() => {
    const rows = playbooksQ.data ?? [];

    return rows.filter((pb: PlaybookRecord) => {
      const matchesConfidence =
        confidence === "all" ? true : pb.confidence === confidence;

      if (!matchesConfidence) return false;

      if (!q) return true;

      const s = q.toLowerCase();

      return (
        pb.alert_id.toLowerCase().includes(s) ||
        pb.model.toLowerCase().includes(s) ||
        pb.playbook.what_happened.toLowerCase().includes(s) ||
        pb.playbook.associated_risk.toLowerCase().includes(s) ||
        pb.playbook.recommended_actions.some(
          (a) =>
            a.action.toLowerCase().includes(s) ||
            (a.reason ?? "").toLowerCase().includes(s)
        )
      );
    });
  }, [playbooksQ.data, q, confidence]);

  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Playbook Library</h1>
          <div className="text-sm text-neutral-400">
            Browse all AI-generated remediation playbooks
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search alert ID, model, risk, actions..."
            className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 w-full md:w-80"
          />

          <select
            value={confidence}
            onChange={(e) =>
              setConfidence(e.target.value as "all" | "high" | "medium" | "low")
            }
            className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-200"
          >
            <option value="all">All confidence</option>
            <option value="high">High confidence</option>
            <option value="medium">Medium confidence</option>
            <option value="low">Low confidence</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        {playbooksQ.isLoading ? (
          <div className="text-neutral-400">Loading playbooks...</div>
        ) : playbooksQ.error ? (
          <div className="text-red-500">
            Failed to load playbooks. Make sure backend is running.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-neutral-400">
            No playbooks matched your search.
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((pb: PlaybookRecord) => (
              <details
                key={pb.playbook_id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-neutral-100">
                        Alert ID: {pb.alert_id}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        Model: {pb.model} • Created:{" "}
                        {new Date(pb.created_at).toLocaleString()}
                      </div>

                      <div className="mt-3 text-sm text-neutral-300 line-clamp-2">
                        {pb.playbook.what_happened}
                      </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-3">
                      <Badge tone={confidenceTone(pb.confidence)}>
                        {pb.confidence}
                      </Badge>

                      <Link
                        to={`/alerts/${encodeURIComponent(pb.alert_id)}`}
                        className="text-sm text-sky-400 hover:underline"
                      >
                        Open linked alert
                      </Link>
                    </div>
                  </div>
                </summary>

                <div className="mt-5 border-t border-neutral-800 pt-4 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-neutral-200">
                      What happened
                    </div>
                    <div className="mt-2 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                      {pb.playbook.what_happened}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-200">
                      Associated risk
                    </div>
                    <div className="mt-2 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                      {pb.playbook.associated_risk}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-200">
                      Recommended actions
                    </div>
                    <div className="mt-3 grid gap-3">
                      {pb.playbook.recommended_actions.map((a, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-neutral-100">
                                {a.action}
                              </div>
                              {a.reason ? (
                                <div className="mt-2 text-xs text-neutral-400 whitespace-pre-wrap">
                                  {a.reason}
                                </div>
                              ) : null}
                            </div>

                            <Badge tone={confidenceTone(a.priority)}>
                              {a.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {pb.sources?.length > 0 ? (
                    <div>
                      <div className="text-sm font-semibold text-neutral-200">
                        Retrieved knowledge sources
                      </div>
                      <div className="mt-3 grid gap-2">
                        {pb.sources.map((s, idx) => (
                          <details
                            key={idx}
                            className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3"
                          >
                            <summary className="cursor-pointer text-xs text-neutral-300">
                              {s.source ?? "kb"}{" "}
                              <span className="text-neutral-500">
                                (score=
                                {typeof s.score === "number"
                                  ? s.score.toFixed(2)
                                  : s.score})
                              </span>
                            </summary>
                            <div className="mt-2 text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed">
                              {s.text ?? ""}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}