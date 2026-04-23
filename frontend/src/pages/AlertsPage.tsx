import { useQuery } from "@tanstack/react-query";
import { AlertsAPI } from "../api/alerts";
import type { NormalizedAlert } from "../types/alert";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Link } from "react-router-dom";

export function AlertsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["alerts"],
    queryFn: AlertsAPI.list,
  });

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Alerts</h1>
          <div className="text-sm text-neutral-400">
            Latest normalized alerts from backend
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mt-6 text-neutral-400">Loading alerts...</div>
      )}

      {error && (
        <div className="mt-6 text-red-500">
          Failed to load alerts. Make sure FastAPI is running.
        </div>
      )}

      {data && (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-xs text-neutral-400 uppercase">
              <tr>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Source IP</th>
                <th className="py-2 pr-4">Severity</th>
              </tr>
            </thead>
            <tbody>
              {data.map((alert: NormalizedAlert) => (
                <tr
                  key={alert.alert_id}
                  className="border-t border-neutral-800 hover:bg-neutral-900/40 transition"
                >
                  <td className="py-3 pr-4 text-sm text-neutral-300">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>

                  <td className="py-3 pr-4 text-sm">
                    <Link
                      to={`/alerts/${alert.alert_id}`}
                      className="text-sky-400 hover:underline"
                    >
                      {alert.title}
                    </Link>
                    <div className="text-xs text-neutral-500">
                      {alert.rule_name}
                    </div>
                  </td>

                  <td className="py-3 pr-4 text-sm text-neutral-300">
                    {alert.username ?? "-"}
                  </td>

                  <td className="py-3 pr-4 text-sm text-neutral-300">
                    {alert.src_ip ?? "-"}
                  </td>

                  <td className="py-3 pr-4 text-sm">
                    <Badge
                      tone={
                        alert.severity === "high"
                          ? "high"
                          : alert.severity === "medium"
                          ? "medium"
                          : "low"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}