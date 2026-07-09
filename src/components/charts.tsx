"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "var(--faint)" };
const TOOLTIP = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text)",
  },
};

export function WeeklyChart({
  data,
}: {
  data: { week: string; solved: number; failed: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} cursor={{ stroke: "var(--line)" }} />
        <Line
          type="monotone"
          dataKey="solved"
          stroke="var(--green)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--green)" }}
        />
        <Line
          type="monotone"
          dataKey="failed"
          stroke="var(--red)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--red)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RateBarChart({
  data,
  color = "var(--accent)",
}: {
  data: { name: string; rate: number; solved: number; total: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 32, bottom: 0, left: 8 }}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...AXIS, fill: "var(--muted)" }}
          width={110}
          tickFormatter={(v: string) =>
            v.length > 16 ? v.slice(0, 15) + "…" : v
          }
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...TOOLTIP}
          cursor={{ fill: "var(--line)" }}
          formatter={(value, _name, entry) => {
            const p = entry?.payload as { solved: number; total: number };
            return [`${value}% (${p.solved}/${p.total})`, "solved"];
          }}
        />
        <Bar dataKey="rate" fill={color} radius={[4, 4, 4, 4]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CountBarChart({
  data,
  color = "var(--accent)",
}: {
  data: { name: string; n: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} cursor={{ fill: "var(--line)" }} />
        <Bar dataKey="n" fill={color} radius={[4, 4, 0, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
