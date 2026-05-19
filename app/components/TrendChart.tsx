"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { C } from "@/app/lib/apex-tokens";

interface TrendPoint {
  date: string;
  value: number | null;
}

interface TrendChartProps {
  title: string;
  data: TrendPoint[];
  color?: string;
  unit?: string;
  domain?: [number, number];
  referenceValue?: number;
  invertColors?: boolean; // true = high is bad (nervous load, stress)
  formatValue?: (v: number) => string;
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function trend(data: TrendPoint[]): "up" | "down" | "flat" {
  const valid = data.filter((d) => d.value !== null) as { date: string; value: number }[];
  if (valid.length < 3) return "flat";
  const recent = valid.slice(-5);
  const first = recent[0].value;
  const last = recent[recent.length - 1].value;
  const diff = last - first;
  if (Math.abs(diff) < 3) return "flat";
  return diff > 0 ? "up" : "down";
}

export function TrendChart({
  title,
  data,
  color,
  unit = "",
  domain,
  referenceValue,
  invertColors = false,
  formatValue,
}: TrendChartProps) {
  const valid = data.filter((d) => d.value !== null);
  if (valid.length < 2) return null;

  const direction = trend(data);
  const lastValue = valid[valid.length - 1].value as number;
  const fmt = formatValue ?? ((v: number) => `${Math.round(v)}${unit}`);

  // Determine chart color
  let chartColor = color;
  if (!chartColor) {
    if (direction === "flat") {
      chartColor = C.muted;
    } else if (invertColors) {
      chartColor = direction === "up" ? C.red : C.green;
    } else {
      chartColor = direction === "up" ? C.green : C.red;
    }
  }

  const trendIcon = direction === "flat" ? "→" : direction === "up" ? "↑" : "↓";
  const trendColor =
    direction === "flat"
      ? C.muted
      : invertColors
      ? direction === "up"
        ? C.red
        : C.green
      : direction === "up"
      ? C.green
      : C.red;

  // Thin the x-axis labels to avoid crowding
  const labelStep = data.length > 20 ? 7 : data.length > 10 ? 3 : 1;

  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{title}</p>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{fmt(lastValue)}</span>
          <span style={{ fontSize: 14, marginLeft: 4, color: trendColor }}>{trendIcon}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={(v, i) => (i % labelStep === 0 ? shortDate(v) : "")}
            tick={{ fontSize: 9, fill: C.muted }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={domain ?? ["auto", "auto"]} hide />
          {referenceValue !== undefined && (
            <ReferenceLine y={referenceValue} stroke={C.border} strokeDasharray="3 3" strokeWidth={1} />
          )}
          <Tooltip
            contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, boxShadow: C.shadow }}
            labelStyle={{ color: C.muted }}
            itemStyle={{ color: C.text }}
            formatter={(v: unknown) => [fmt(v as number), title]}
            labelFormatter={(l: unknown) => shortDate(String(l))}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={2}
            fill={`url(#grad-${title})`}
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
