"use client";

interface ScoreRingProps {
  score: number | null;
  label?: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number | null): string {
  if (score === null) return "#888780";
  if (score >= 70) return "#3B6D11";
  if (score >= 50) return "#854F0B";
  return "#A32D2D";
}

export function ScoreRing({ score, label, size = "lg" }: ScoreRingProps) {
  const color = getScoreColor(score);

  const sizes = {
    sm: { w: 64,  text: 18, stroke: 5, r: 26 },
    md: { w: 96,  text: 24, stroke: 5, r: 40 },
    lg: { w: 100, text: 28, stroke: 7, r: 42 },
  }[size];

  const circumference = 2 * Math.PI * sizes.r;
  const progress = score !== null ? Math.min(Math.max(score, 0), 100) / 100 : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const center = sizes.w / 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: sizes.w, height: sizes.w, flexShrink: 0 }}>
        <svg width={sizes.w} height={sizes.w} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={center} cy={center} r={sizes.r} fill="none" stroke="#E8E7E4" strokeWidth={sizes.stroke} />
          <circle
            cx={center} cy={center} r={sizes.r} fill="none"
            stroke={color} strokeWidth={sizes.stroke}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: sizes.text, fontWeight: 700, color, lineHeight: 1 }}>
            {score !== null ? Math.round(score) : "—"}
          </span>
        </div>
      </div>
      {label && (
        <span style={{ fontSize: 11, color: "#888780", textAlign: "center" }}>{label}</span>
      )}
    </div>
  );
}
