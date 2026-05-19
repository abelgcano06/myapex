"use client";

interface MetricRowProps {
  label: string;
  value: string | number | null;
  status: "green" | "amber" | "red" | "neutral";
  unit?: string;
}

const statusColors = {
  green: "#22c55e",
  amber: "#eab308",
  red: "#ef4444",
  neutral: "#888888",
};

export function MetricRow({ label, value, status, unit }: MetricRowProps) {
  const color = statusColors[status];

  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-[#888888]">{label}</span>
      </div>
      <span className="text-sm font-medium text-white">
        {value !== null && value !== undefined ? (
          <>
            {value}
            {unit && <span className="text-[#888888] ml-0.5">{unit}</span>}
          </>
        ) : (
          <span className="text-[#888888]">--</span>
        )}
      </span>
    </div>
  );
}
