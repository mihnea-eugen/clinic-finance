"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PLData {
  month_label: string;
  total_income: number;
  total_expense: number;
  profit: number;
}

const formatRON = (v: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(v);

export default function PLChart({ data }: { data: PLData[] }) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Date insuficiente
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    venituri: Number(d.total_income),
    cheltuieli: Number(d.total_expense),
    profit: Number(d.profit),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="month_label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={36}
        />
        <Tooltip
          formatter={(v: number, name: string) => [formatRON(v), name]}
          contentStyle={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 8 }}
        />
        <ReferenceLine y={0} stroke="#e2e8f0" />
        <Bar dataKey="venituri" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cheltuieli" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
