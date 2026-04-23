import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type TechniqueRow = {
  technique_id: string;
  count: number;
};

export function TopTechniquesChart({
  rows,
}: {
  rows: TechniqueRow[];
}) {
  const data = rows.map((r) => ({
    name: r.technique_id,
    count: r.count,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#a3a3a3", fontSize: 12 }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#171717",
              border: "1px solid #404040",
              color: "#f5f5f5",
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}