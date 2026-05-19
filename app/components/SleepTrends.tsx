"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "./TrendChart";

interface SleepHistoryRow {
  calendar_date: string;
  overall_recovery_score: number;
  avg_overnight_hrv: number;
  recharge_efficiency: number;
  deep_ratio: number;
  rem_ratio: number;
  sleep_time_seconds: number;
  avg_sleep_stress: number;
  neural_recovery_score: number;
}

function pick(rows: SleepHistoryRow[], field: keyof SleepHistoryRow) {
  return rows.map((r) => ({
    date: r.calendar_date,
    value: r[field] != null ? Number(r[field]) : null,
  }));
}

export function SleepTrends() {
  const [rows, setRows] = useState<SleepHistoryRow[]>([]);

  useEffect(() => {
    fetch("/api/history?section=sleep&days=30")
      .then((r) => r.json())
      .then((data: SleepHistoryRow[]) => setRows(data))
      .catch(() => {});
  }, []);

  if (rows.length < 3) return null;

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
          title="Recuperación"
          data={pick(rows, "overall_recovery_score")}
          domain={[0, 100]}
          unit="/100"
          referenceValue={70}
        />
        <TrendChart
          title="HRV nocturno"
          data={pick(rows, "avg_overnight_hrv")}
          unit=" ms"
        />
        <TrendChart
          title="Eficiencia de recarga"
          data={pick(rows, "recharge_efficiency")}
          domain={[0, 100]}
          unit="%"
          referenceValue={60}
        />
        <TrendChart
          title="Sueño profundo"
          data={pick(rows, "deep_ratio").map((p) => ({
            date: p.date,
            value: p.value != null ? Math.round(p.value * 100) : null,
          }))}
          domain={[0, 40]}
          unit="%"
          referenceValue={16}
        />
        <TrendChart
          title="REM"
          data={pick(rows, "rem_ratio").map((p) => ({
            date: p.date,
            value: p.value != null ? Math.round(p.value * 100) : null,
          }))}
          domain={[0, 40]}
          unit="%"
          referenceValue={20}
        />
        <TrendChart
          title="Horas dormidas"
          data={pick(rows, "sleep_time_seconds").map((p) => ({
            date: p.date,
            value: p.value != null ? Math.round((p.value / 3600) * 10) / 10 : null,
          }))}
          domain={[4, 10]}
          unit="h"
          referenceValue={7.5}
          formatValue={(v) => `${v}h`}
        />
        <TrendChart
          title="Estrés nocturno"
          data={pick(rows, "avg_sleep_stress")}
          invertColors
          unit=""
        />
      </div>
    </div>
  );
}
