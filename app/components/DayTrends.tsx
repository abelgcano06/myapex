"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "./TrendChart";

interface DayHistoryRow {
  calendar_date: string;
  overall_day_state_score: number;
  nervous_system_load_score: number;
  energy_dynamics_score: number;
  recovery_response_score: number;
  body_battery_change: number;
  avg_stress: number;
  steps: number;
  atl: number;
  ctl: number;
  tsb: number;
}

function pick(rows: DayHistoryRow[], field: keyof DayHistoryRow) {
  return rows.map((r) => ({
    date: r.calendar_date,
    value: r[field] != null ? Number(r[field]) : null,
  }));
}

export function DayTrends() {
  const [rows, setRows] = useState<DayHistoryRow[]>([]);

  useEffect(() => {
    fetch("/api/history?section=day&days=30")
      .then((r) => r.json())
      .then((data: DayHistoryRow[]) => setRows(data))
      .catch(() => {});
  }, []);

  if (rows.length < 3) return null;

  const hasTss = rows.some((r) => r.atl != null && r.atl > 0);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#22c55e]">
          ⚡ Tendencias 30 días
        </span>
        <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
      </div>

      <div className="flex flex-col gap-3">
        <TrendChart
          title="Estado del día"
          data={pick(rows, "overall_day_state_score")}
          domain={[0, 100]}
          unit="/100"
          referenceValue={65}
        />
        <TrendChart
          title="Carga nerviosa"
          data={pick(rows, "nervous_system_load_score")}
          domain={[0, 100]}
          unit="/100"
          invertColors
          referenceValue={50}
        />
        <TrendChart
          title="Energía del día"
          data={pick(rows, "energy_dynamics_score")}
          domain={[0, 100]}
          unit="/100"
          referenceValue={60}
        />
        <TrendChart
          title="Respuesta de recuperación"
          data={pick(rows, "recovery_response_score")}
          domain={[0, 100]}
          unit="/100"
          referenceValue={60}
        />
        <TrendChart
          title="Body Battery cambio neto"
          data={pick(rows, "body_battery_change")}
          unit=" pts"
          referenceValue={0}
          formatValue={(v) => `${v >= 0 ? "+" : ""}${Math.round(v)} pts`}
        />
        <TrendChart
          title="Estrés promedio"
          data={pick(rows, "avg_stress")}
          invertColors
          unit=""
        />
        <TrendChart
          title="Pasos"
          data={pick(rows, "steps")}
          unit=""
          referenceValue={10000}
          formatValue={(v) => `${Math.round(v / 1000 * 10) / 10}k`}
        />
        {hasTss && (
          <>
            <TrendChart
              title="Carga aguda (ATL)"
              data={pick(rows, "atl")}
              color="#f97316"
              unit=""
              formatValue={(v) => `${Math.round(v)}`}
            />
            <TrendChart
              title="Forma (TSB)"
              data={pick(rows, "tsb")}
              unit=""
              referenceValue={0}
              formatValue={(v) => `${v >= 0 ? "+" : ""}${Math.round(v)}`}
            />
          </>
        )}
      </div>
    </div>
  );
}
