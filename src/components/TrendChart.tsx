"use client";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";


const LABELS: Record<string, string> = { WH: "Warehouse", HO: "Head Office", FOUNDER: "Founder" };
const short = (v: number) =>
  v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v);
const inr = (v: number) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

type Row = { label: string; WH: number; HO: number; FOUNDER: number; total: number };

export default function TrendChart({ data }: { data: Row[] }) {
  if (!data.length) return <p className="text-sm text-muted">No data yet.</p>;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -10 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="2 4" stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                 tickLine={false} axisLine={false} dy={4} />
          <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                 tickLine={false} axisLine={false} width={46} />
          <Tooltip
            cursor={{ fill: "var(--color-canvas)" }}
            formatter={(v, k) => [inr(Number(v ?? 0)), LABELS[String(k)] ?? String(k)]}
            contentStyle={{
              borderRadius: 12, border: "1px solid var(--color-line)",
              background: "var(--color-surface)", color: "var(--color-ink)",
              fontSize: 12, boxShadow: "var(--shadow-pop)",
            }}
          />
          <Legend formatter={(k) => LABELS[String(k)] ?? String(k)}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {/* 2px surface gap between stacked segments, per the mark spec */}
          <Bar dataKey="WH" stackId="a" fill="var(--series-wh)" isAnimationActive={false}
               stroke="var(--color-surface)" strokeWidth={2} />
          <Bar dataKey="HO" stackId="a" fill="var(--series-ho)" isAnimationActive={false}
               stroke="var(--color-surface)" strokeWidth={2} />
          <Bar dataKey="FOUNDER" stackId="a" fill="var(--series-founder)" isAnimationActive={false}
               stroke="var(--color-surface)" strokeWidth={2} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
