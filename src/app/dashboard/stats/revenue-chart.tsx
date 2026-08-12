"use client";

// The only file in the stats tab that imports Recharts (client-only: it needs
// the DOM to measure its container). Colors are passed as CSS custom-property
// STRINGS ("var(--color-accent)") rather than hex literals — Recharts writes
// these straight onto the underlying SVG `stroke`/`fill` attributes, and those
// resolve the token from whichever theme scope the chart renders inside
// (here, the dashboard's blue `.dashboard-scope`). If this ever renders black,
// the escape hatch is the literal hex: #2563eb.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ACCENT = "var(--color-accent)";
const BORDER = "var(--color-border)";
const INK_SOFT = "var(--color-ink-soft)";

export type RevenuePoint = {
  label: string; // short month name, e.g. "אוג׳"
  revenue: number; // shekels (not agorot) — chart data is display-only
};

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  return (
    // dir="ltr": a time series reads oldest -> newest left-to-right universally,
    // even inside an RTL page — inheriting rtl here would mirror the axis.
    <div data-chart="revenue" dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: INK_SOFT, fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: INK_SOFT, fontSize: 12 }}
            tickFormatter={(v: number) => `₪${v}`}
          />
          <Tooltip
            cursor={{ stroke: ACCENT, strokeOpacity: 0.3 }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              background: "var(--color-surface)",
              direction: "rtl",
            }}
            formatter={(value) => [`₪${Number(value).toLocaleString("he-IL")}`, "הכנסות"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={ACCENT}
            strokeWidth={2.5}
            dot={{ r: 3, fill: ACCENT }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
