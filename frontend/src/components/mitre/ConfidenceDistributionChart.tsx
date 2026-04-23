import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

type ConfidenceRow = {
  name: string;
  value: number;
};

const COLORS: Record<string, string> = {
  high: "#22c55e",   // bright green
  medium: "#3b82f6", // bright blue
  low: "#a855f7",    // bright purple
};

export function ConfidenceDistributionChart({
  rows,
}: {
  rows: ConfidenceRow[];
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#a3a3a3", fontSize: 12 }}
          />
          <YAxis tick={{ fill: "#a3a3a3", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#171717",
              border: "1px solid #404040",
              color: "#f5f5f5",
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {rows.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name.toLowerCase()] ?? "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}