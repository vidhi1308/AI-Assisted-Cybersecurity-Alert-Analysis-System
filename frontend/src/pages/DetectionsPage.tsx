import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { DetectionsAPI } from "../api/detections";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import type { DetectionItem } from "../types/detection";

function getDetectionId(d: DetectionItem): string {
  if (typeof d === "string") return d;
  return d.id || d.detection_id || d.name || d.title || "unknown-detection";
}

function getDetectionTitle(d: DetectionItem): string {
  if (typeof d === "string") return d;
  return d.title || d.name || d.id || d.detection_id || "Untitled Detection";
}

function getDetectionDescription(d: DetectionItem): string {
  if (typeof d === "string") return "";
  return d.description || "";
}

function getDetectionTechniques(d: DetectionItem): string[] {
  if (typeof d === "string") return [];
  return Array.isArray(d.techniques) ? d.techniques : [];
}

function getDetectionTactics(d: DetectionItem): string[] {
  if (typeof d === "string") return [];
  return Array.isArray(d.tactics) ? d.tactics : [];
}

export function DetectionsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const detectionsQ = useQuery({
    queryKey: ["detections"],
    queryFn: () => DetectionsAPI.list(),
  });

  const genMutation = useMutation({
    mutationFn: (detectionId: string) => DetectionsAPI.generateAndSave(detectionId),
    onMutate(detectionId) {
      toast.loading(`Generating alert for ${detectionId}...`, { id: "gendetect" });
    },
    onSuccess(data) {
      toast.success(`Alert created: ${data.alert_id}`, { id: "gendetect" });

      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["mitre", "heatmap"] });
      qc.invalidateQueries({ queryKey: ["playbooks"] });

      navigate(`/alerts/${encodeURIComponent(data.alert_id)}`);
    },
    onError(err: any) {
      toast.error(`Generation failed: ${err?.message ?? "unknown error"}`, { id: "gendetect" });
    },
  });

  const detections = detectionsQ.data?.detections ?? [];

  const filtered = useMemo(() => {
    if (!q) return detections;
    const s = q.toLowerCase();

    return detections.filter((d) => {
      const id = getDetectionId(d).toLowerCase();
      const title = getDetectionTitle(d).toLowerCase();
      const desc = getDetectionDescription(d).toLowerCase();
      const tactics = getDetectionTactics(d).join(" ").toLowerCase();
      const techniques = getDetectionTechniques(d).join(" ").toLowerCase();

      return (
        id.includes(s) ||
        title.includes(s) ||
        desc.includes(s) ||
        tactics.includes(s) ||
        techniques.includes(s)
      );
    });
  }, [detections, q]);

  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Detection Explorer</h1>
          <div className="text-sm text-neutral-400">
            Browse detection rules and generate realistic alerts directly from the UI
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, tactic, technique..."
          className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 w-full md:w-80"
        />
      </div>

      <div className="mt-6">
        {detectionsQ.isLoading ? (
          <div className="text-neutral-400">Loading detections...</div>
        ) : detectionsQ.error ? (
          <div className="text-red-500">
            Failed to load detections. Make sure backend is running.
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((d, idx) => {
              const detectionId = getDetectionId(d);
              const title = getDetectionTitle(d);
              const description = getDetectionDescription(d);
              const tactics = getDetectionTactics(d);
              const techniques = getDetectionTechniques(d);

              return (
                <div
                  key={`${detectionId}-${idx}`}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-100 break-words">
                        {title}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500 break-all">
                        ID: {detectionId}
                      </div>

                      {description ? (
                        <div className="mt-3 text-sm text-neutral-300 leading-relaxed">
                          {description}
                        </div>
                      ) : null}

                      {tactics.length > 0 ? (
                        <div className="mt-3">
                          <div className="text-xs text-neutral-400 mb-1">Tactics</div>
                          <div className="flex flex-wrap gap-2">
                            {tactics.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-1 rounded-md bg-neutral-800 text-xs text-neutral-200"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {techniques.length > 0 ? (
                        <div className="mt-3">
                          <div className="text-xs text-neutral-400 mb-1">Techniques</div>
                          <div className="flex flex-wrap gap-2">
                            {techniques.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-xs text-sky-300"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      <Button
                        onClick={() => genMutation.mutate(detectionId)}
                        disabled={genMutation.isPending}
                      >
                        {genMutation.isPending ? "Generating..." : "Generate & Save Alert"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 ? (
              <div className="text-sm text-neutral-400">
                No detections matched your search.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}