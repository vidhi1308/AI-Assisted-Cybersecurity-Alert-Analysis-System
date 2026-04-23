import ReactJson from "@uiw/react-json-view";

export function PlaybookJsonView({ obj }: { obj: any }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 overflow-auto">
      <ReactJson
        value={obj}
        collapsed={1}
        displayDataTypes={false}
        enableClipboard={true}
      />
    </div>
  );
}