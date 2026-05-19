"use client";

interface Zone {
  seconds: number;
  minutes: number;
  pct: number;
}

interface PowerZonesChartProps {
  zones: Record<string, Zone>;
  ftp: number | null;
}

const ZONE_COLORS: Record<string, string> = {
  Z1: "#3b82f6",
  Z2: "#22c55e",
  Z3: "#84cc16",
  Z4: "#eab308",
  Z5: "#f97316",
  Z6: "#ef4444",
  Z7: "#9333ea",
};

const ZONE_LABELS: Record<string, string> = {
  Z1: "Z1 Recuperación",
  Z2: "Z2 Resistencia",
  Z3: "Z3 Tempo",
  Z4: "Z4 Umbral",
  Z5: "Z5 VO2max",
  Z6: "Z6 Anaeróbico",
  Z7: "Z7 Neuromuscular",
};

function ftpRange(z: string, ftp: number | null): string {
  if (!ftp) return "";
  const ranges: Record<string, [number, number | null]> = {
    Z1: [0, Math.round(ftp * 0.55)],
    Z2: [Math.round(ftp * 0.56), Math.round(ftp * 0.75)],
    Z3: [Math.round(ftp * 0.76), Math.round(ftp * 0.90)],
    Z4: [Math.round(ftp * 0.91), Math.round(ftp * 1.05)],
    Z5: [Math.round(ftp * 1.06), Math.round(ftp * 1.20)],
    Z6: [Math.round(ftp * 1.21), Math.round(ftp * 1.50)],
    Z7: [Math.round(ftp * 1.51), null],
  };
  const r = ranges[z];
  if (!r) return "";
  return r[1] ? `${r[0]}–${r[1]} W` : `>${r[0]} W`;
}

export function PowerZonesChart({ zones, ftp }: PowerZonesChartProps) {
  const keys = ["Z7", "Z6", "Z5", "Z4", "Z3", "Z2", "Z1"];
  const available = keys.filter((z) => zones[z]?.pct > 0);
  if (available.length === 0) return null;

  return (
    <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#22c55e" }}>
          ⚡ Distribución de zonas de potencia
        </p>
        {ftp && (
          <span className="text-[10px] text-[#555555]">FTP {Math.round(ftp)} W</span>
        )}
      </div>

      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden mb-4" style={{ background: "#1a1a1a" }}>
        {keys.filter((z) => zones[z]?.pct > 0).reverse().map((z) => (
          <div
            key={z}
            style={{ width: `${zones[z].pct}%`, background: ZONE_COLORS[z] }}
            title={`${z}: ${zones[z].pct.toFixed(1)}%`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {keys.filter((z) => zones[z]).map((z) => {
          const zone = zones[z];
          return (
            <div key={z} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ZONE_COLORS[z] }} />
              <span className="text-xs text-[#888888] flex-1">{ZONE_LABELS[z]}</span>
              {ftp && (
                <span className="text-[10px] text-[#444444] w-20 text-right">{ftpRange(z, ftp)}</span>
              )}
              <span className="text-xs font-semibold text-white w-10 text-right">
                {Math.round(zone.minutes)}m
              </span>
              <span className="text-xs text-[#555555] w-10 text-right">
                {zone.pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
