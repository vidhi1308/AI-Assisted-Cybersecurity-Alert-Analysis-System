import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type SeverityRow = {
  name: string;
  value: number;
};

const COLORS: Record<string, string> = {
  high: "#a855f7",   // bright purple
  medium: "#3b82f6", // bright blue
  low: "#22c55e",    // bright green
  unknown: "#94a3b8",
};

export function SeverityDistributionChart({
  rows,
}: {
  rows: SeverityRow[];
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={95}
            innerRadius={45}
            paddingAngle={3}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {rows.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name.toLowerCase()] ?? COLORS.unknown}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: "#171717",
              border: "1px solid #404040",
              color: "#f5f5f5",
            }}
          />

          <Legend
            wrapperStyle={{
              fontSize: "12px",
              color: "#d4d4d4",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}