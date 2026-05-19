"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface SeriesPoint {
  t: number;
  elev: number | null;
  hr: number | null;
  power: number | null;
}

interface ActivitySeriesChartProps {
  activityId: string;
}

export function ActivitySeriesChart({ activityId }: ActivitySeriesChartProps) {
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [hasPower, setHasPower] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSeries([]);
    fetch(`/api/activity/series?id=${activityId}`)
      .then((r) => r.json())
      .then((d) => {
        setSeries(d.series ?? []);
        setHasPower(d.has_power ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activityId]);

  if (loading) return (
    <div className="rounded-xl p-4 flex items-center justify-center h-24" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
      <p className="text-xs text-[#555555]">Cargando serie...</p>
    </div>
  );

  if (series.length < 5) return null;

  const elevMin = Math.min(...series.map((s) => s.elev ?? Infinity).filter(isFinite));
  const elevMax = Math.max(...series.map((s) => s.elev ?? -Infinity).filter(isFinite));
  const elevPad = (elevMax - elevMin) * 0.1;

  const hrColor = "#f97316";
  const powerColor = "#3b82f6";
  const elevColor = "#2a2a2a";

  return (
    <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#22c55e] mb-1">
        ⚡ Perfil de la actividad
      </p>
      <p className="text-[10px] text-[#555555] mb-3">
        Elevación · FC{hasPower ? " · Potencia" : ""}
      </p>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#444444" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#444444" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="t"
            tickFormatter={(v) => `${Math.round(v)}'`}
            tick={{ fontSize: 9, fill: "#555555" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          {/* Left Y: elevation */}
          <YAxis
            yAxisId="elev"
            domain={[elevMin - elevPad, elevMax + elevPad]}
            hide
          />

          {/* Right Y: HR / Power (0–max) */}
          <YAxis yAxisId="perf" orientation="right" hide />

          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 10 }}
            labelStyle={{ color: "#888888" }}
            labelFormatter={(l: unknown) => `${l}'`}
            formatter={(v: unknown, name: unknown) => {
              const n = String(name);
              const num = Math.round(Number(v));
              if (n === "elev") return [`${num} m`, "Elevación"] as [string, string];
              if (n === "hr") return [`${num} bpm`, "FC"] as [string, string];
              if (n === "power") return [`${num} W`, "Potencia"] as [string, string];
              return [`${v}`, n] as [string, string];
            }}
          />

          {/* Elevation area */}
          <Area
            yAxisId="elev"
            type="monotone"
            dataKey="elev"
            stroke="#555555"
            strokeWidth={1}
            fill="url(#elevGrad)"
            dot={false}
            connectNulls
          />

          {/* HR line */}
          <Line
            yAxisId="perf"
            type="monotone"
            dataKey="hr"
            stroke={hrColor}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />

          {/* Power line (only if available) */}
          {hasPower && (
            <Line
              yAxisId="perf"
              type="monotone"
              dataKey="power"
              stroke={powerColor}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          )}

          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            formatter={(value) => {
              if (value === "elev") return <span style={{ color: "#888888" }}>Elevación (m)</span>;
              if (value === "hr") return <span style={{ color: hrColor }}>FC (bpm)</span>;
              if (value === "power") return <span style={{ color: powerColor }}>Potencia (W)</span>;
              return value;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
