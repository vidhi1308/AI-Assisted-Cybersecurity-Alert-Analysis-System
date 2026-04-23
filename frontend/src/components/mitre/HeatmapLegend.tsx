function swatch(cls: string) {
  return <span className={`inline-block h-3 w-6 rounded-sm border border-neutral-700 ${cls}`} />;
}

export function HeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
      <div className="flex items-center gap-2">
        {swatch("bg-neutral-900")} <span>0</span>
      </div>
      <div className="flex items-center gap-2">
        {swatch("bg-blue-950")} <span>1</span>
      </div>
      <div className="flex items-center gap-2">
        {swatch("bg-blue-900")} <span>2</span>
      </div>
      <div className="flex items-center gap-2">
        {swatch("bg-blue-800")} <span>3</span>
      </div>
      <div className="flex items-center gap-2">
        {swatch("bg-blue-700")} <span>4</span>
      </div>
      <div className="flex items-center gap-2">
        {swatch("bg-blue-600")} <span>5+</span>
      </div>

      <div className="ml-2 text-neutral-500">
        Dark → no playbook-backed alerts • Brighter → more playbook-backed alerts
      </div>
    </div>
  );
}