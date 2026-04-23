import type { PlaybookRecord } from "../../types/playbook";
import { Badge } from "../ui/Badge";
import toast from "react-hot-toast";

function priorityTone(p: string) {
  if (p === "high") return "high";
  if (p === "medium") return "medium";
  return "low";
}

export function PlaybookPretty({ record }: { record: PlaybookRecord }) {
  const pb = record.playbook;

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (e) {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm text-neutral-400">What happened</div>
          <div className="mt-2 text-base text-neutral-100 whitespace-pre-wrap leading-relaxed">
            {pb.what_happened}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-400">Model</div>
          <div className="text-sm font-medium">{record.model}</div>

          <div className="mt-3 text-xs text-neutral-400">Confidence</div>
          <div className="mt-1">
            <Badge tone={priorityTone(record.confidence)}>{record.confidence}</Badge>
          </div>

          <div className="mt-3 text-xs text-neutral-400">Created</div>
          <div className="text-sm">{new Date(record.created_at).toLocaleString()}</div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => copyText(JSON.stringify(record.playbook, null, 2))}
              className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700"
            >
              Copy playbook JSON
            </button>
          </div>
        </div>
      </div>

      {/* Risk */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="text-sm font-semibold">Associated risk</div>
        <div className="mt-2 text-sm text-neutral-200 whitespace-pre-wrap">
          {pb.associated_risk}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="text-sm font-semibold">Recommended actions</div>
        <div className="mt-3 grid gap-3">
          {pb.recommended_actions?.map((a, idx) => (
            <div key={idx} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-100">{a.action}</div>
                  {a.reason ? (
                    <div className="mt-2 text-xs text-neutral-400 whitespace-pre-wrap">{a.reason}</div>
                  ) : null}
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <Badge tone={priorityTone(a.priority)}>{a.priority}</Badge>
                  <button
                    onClick={() => copyText(a.action + (a.reason ? `\n\nReason: ${a.reason}` : ""))}
                    className="mt-2 px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!pb.recommended_actions || pb.recommended_actions.length === 0) && (
            <div className="text-sm text-neutral-400">No actions returned.</div>
          )}
        </div>
      </div>

      {/* Sources */}
      {record.sources?.length ? (
        <div>
          <div className="text-sm font-semibold">RAG sources (KB snippets)</div>
          <div className="mt-2 grid gap-2">
            {record.sources.map((s, i) => (
              <details key={i} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                <summary className="cursor-pointer text-sm text-neutral-200">
                  {s.source ?? "kb"}{" "}
                  <span className="text-neutral-500">(score={typeof s.score === "number" ? s.score.toFixed(2) : s.score})</span>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); navigator.clipboard.writeText(s.text ?? ""); toast.success("Snippet copied"); }}
                    className="ml-3 px-2 py-0.5 text-xs rounded bg-neutral-800 hover:bg-neutral-700"
                  >
                    Copy snippet
                  </button>
                </summary>
                <div className="mt-2 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">{s.text ?? ""}</div>
              </details>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}