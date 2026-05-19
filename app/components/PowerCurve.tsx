"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

interface PowerCurveProps {
  // Session-specific power profile (from analysis.power_profile)
  sessionCurve: Record<string, { avg_power: number; avg_hr?: number } | null>;
  // All-time best across all sessions (from ftp_profile.power_curve_best)
  bestCurve?: Record<string, { power: number; date: string; hr?: number | null }>;
  ftp: number | null;
}

const DURATION_ORDER = ["1s","5s","10s","30s","1min","3min","5min","8min","10min","20min","30min","60min"];
const DURATION_LABELS: Record<string, string> = {
  "1s":"1s","5s":"5s","10s":"10s","30s":"30s",
  "1min":"1'","3min":"3'","5min":"5'","8min":"8'",
  "10min":"10'","20min":"20'","30min":"30'","60min":"60'",
};

export function PowerCurve({ sessionCurve, bestCurve, ftp }: PowerCurveProps) {
  const data = DURATION_ORDER.map((dur) => {
    const session = sessionCurve?.[dur];
    const best = bestCurve?.[dur];
    return {
      duration: dur,
      sesion: session?.avg_power ? Math.round(session.avg_power) : null,
      record: best?.power ? Math.round(best.power) : null,
    };
  }).filter((d) => d.sesion !== null || d.record !== null);

  if (data.length < 2) return null;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.sesion ?? 0, d.record ?? 0))
  );

  // Table: show session values for durations that have data
  const tableItems = data.filter((d) => d.sesion !== null).slice(0, 8);

  return (
    <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#22c55e]">
            ⚡ Curva de potencia
          </p>
          <p className="text-[10px] text-[#555555] mt-0.5">
            Esta sesión vs tu récord personal
          </p>
        </div>
        {ftp && (
          <div className="text-right">
            <p className="text-[10px] text-[#555555]">FTP est.</p>
            <p className="text-lg font-black" style={{ color: "#f97316" }}>{Math.round(ftp)} W</p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="duration"
            tickFormatter={(v) => DURATION_LABELS[v] ?? v}
            tick={{ fontSize: 9, fill: "#555555" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, Math.ceil(maxVal * 1.1)]} hide />
          {ftp && (
            <ReferenceLine
              y={ftp}
              stroke="#f97316"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 10 }}
            labelFormatter={(l: unknown) => `${DURATION_LABELS[String(l)] ?? l}`}
            formatter={(v: unknown, name: unknown) => {
              const label = String(name) === "sesion" ? "Esta sesión" : "Récord personal";
              return [`${v} W`, label] as [string, string];
            }}
          />
          {/* Best curve — grey reference */}
          {bestCurve && (
            <Line
              type="monotone"
              dataKey="record"
              stroke="#444444"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 4"
              connectNulls
            />
          )}
          {/* Session curve — orange */}
          <Line
            type="monotone"
            dataKey="sesion"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={{ fill: "#f97316", r: 3 }}
            connectNulls
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
            formatter={(value) => {
              if (value === "sesion") return <span style={{ color: "#f97316" }}>Esta sesión</span>;
              if (value === "record") return <span style={{ color: "#444444" }}>Récord personal</span>;
              return value;
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Table */}
      {tableItems.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {tableItems.map((d) => {
            const isRecord = d.record !== null && d.sesion !== null && d.sesion >= d.record;
            return (
              <div key={d.duration} className="rounded-lg p-1.5 text-center" style={{ background: "#1a1a1a" }}>
                <p className="text-[9px] text-[#555555]">{DURATION_LABELS[d.duration]}</p>
                <p className="text-xs font-bold" style={{ color: isRecord ? "#22c55e" : "white" }}>
                  {d.sesion ? `${d.sesion}W` : "—"}
                </p>
                {d.record && d.sesion && d.record !== d.sesion && (
                  <p className="text-[8px] text-[#444444]">PR: {d.record}W</p>
                )}
                {isRecord && (
                  <p className="text-[8px] text-[#22c55e]">PR ✓</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
