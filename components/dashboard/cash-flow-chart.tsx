"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

interface ChartDataPoint {
  date: string;
  total_income: number;
  total_expense: number;
  income_cash: number;
  income_card: number;
}

interface Props {
  data: ChartDataPoint[];
}

const formatRON = (v: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(v);

export default function CashFlowChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Nicio dată disponibilă încă
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), "d MMM", { locale: ro }),
    venituri: Number(d.total_income),
    cheltuieli: Number(d.total_expense),
    cash: Number(d.income_cash),
    card: Number(d.income_card),
  }));

  return (
    <div className="space-y-4">
      {/* Chart principal: venituri vs cheltuieli */}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={formatted} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVenituri" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCheltuieli" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={4}
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
            contentStyle={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="venituri" stroke="#22c55e" strokeWidth={2} fill="url(#colorVenituri)" />
          <Area type="monotone" dataKey="cheltuieli" stroke="#ef4444" strokeWidth={2} fill="url(#colorCheltuieli)" />
        </AreaChart>
      </ResponsiveContainer>

      {/* Breakdown cash vs card */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400 mb-1">Cash (perioadă)</p>
          <p className="text-sm font-semibold text-slate-700">
            {formatRON(formatted.reduce((s, d) => s + d.cash, 0))}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Card (perioadă)</p>
          <p className="text-sm font-semibold text-slate-700">
            {formatRON(formatted.reduce((s, d) => s + d.card, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
