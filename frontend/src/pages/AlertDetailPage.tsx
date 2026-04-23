import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { AlertsAPI } from "../api/alerts";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PlaybookPretty } from "../components/playbook/PlaybookPretty";
import { PlaybookJsonView } from "../components/playbook/PlaybookJsonView";

export function AlertDetailPage() {
  const { alertId } = useParams<{ alertId: string }>();
  const qc = useQueryClient();

  const alertQ = useQuery({
    queryKey: ["alert", alertId],
    queryFn: () => AlertsAPI.get(alertId!),
    enabled: !!alertId,
  });

  const playbookQ = useQuery({
    queryKey: ["playbook", alertId],
    queryFn: () => AlertsAPI.getPlaybook(alertId!),
    enabled: !!alertId,
    retry: false,
  });

  const gen = useMutation({
    mutationFn: () => AlertsAPI.generatePlaybook(alertId!),
    onMutate() {
      toast.loading("Generating playbook...", { id: "genpb" });
    },
    onSuccess() {
      toast.success("Playbook generated successfully", { id: "genpb" });
      qc.invalidateQueries({ queryKey: ["playbook", alertId] });
      qc.invalidateQueries({ queryKey: ["playbooks"] });
      qc.invalidateQueries({ queryKey: ["mitre", "heatmap"] });
    },
    onError(err: any) {
      toast.error(`Playbook generation failed: ${err?.message ?? "unknown error"}`, {
        id: "genpb",
      });
    },
  });

  const alert = alertQ.data;

  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {alert ? alert.title : "Alert Details"}
          </h1>
          <div className="text-sm text-neutral-400">
            Alert ID: <span className="text-neutral-200">{alertId}</span>
          </div>

          {alert?.rule_name ? (
            <div className="text-sm text-neutral-500 mt-1">
              Rule: {alert.rule_name}
            </div>
          ) : null}

          {alert?.severity ? (
            <div className="text-sm text-neutral-500 mt-1">
              Severity: {alert.severity}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? "Generating..." : "Generate Playbook"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-semibold mb-2">Normalized alert</div>
          <div
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 overflow-auto"
            style={{ maxHeight: 520 }}
          >
            <pre className="text-xs text-neutral-200">
              {alert ? JSON.stringify(alert, null, 2) : "Loading..."}
            </pre>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Playbook</div>

          {playbookQ.isLoading ? (
            <div className="text-sm text-neutral-400">Loading playbook...</div>
          ) : playbookQ.data ? (
            <div className="space-y-6">
              <PlaybookPretty record={playbookQ.data} />

              <div>
                <div className="text-sm font-semibold mb-2">Raw JSON</div>
                <PlaybookJsonView obj={playbookQ.data.playbook} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-sm text-neutral-400">
              No playbook exists yet. Click{" "}
              <span className="text-neutral-200 font-semibold">
                Generate Playbook
              </span>{" "}
              to create one for this alert.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}