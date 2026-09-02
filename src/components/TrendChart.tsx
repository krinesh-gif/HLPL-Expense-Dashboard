"use client";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = { WH: "#14603f", HO: "#2f8f66", FOUNDER: "#9ec9b4" };
const LABELS: Record<string, string> = { WH: "Warehouse", HO: "Head Office", FOUNDER: "Founder" };
const short = (v: number) =>
  v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v);
const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

export default function TrendChart({
  data,
}: { data: { label: string; WH: number; HO: number; FOUNDER: number; total: number }[] }) {
  if (!data.length) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e7ee" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#626b7a" }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: "#626b7a" }} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v, k) => [inr(Number(v ?? 0)), LABELS[String(k)] ?? String(k)]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e3e7ee", fontSize: 12 }}
          />
          <Legend formatter={(k) => LABELS[String(k)] ?? String(k)} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="WH" stackId="a" fill={COLORS.WH} isAnimationActive={false} />
          <Bar dataKey="HO" stackId="a" fill={COLORS.HO} isAnimationActive={false} />
          <Bar dataKey="FOUNDER" stackId="a" fill={COLORS.FOUNDER} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
