"use client";

import { C } from "@/app/lib/apex-tokens";

interface HistoryBar {
  date: string;
  score: number | null;
}

interface HistoryBarsProps {
  data: HistoryBar[];
  selectedDate?: string;
  onSelect?: (date: string) => void;
}

function barColor(score: number | null): string {
  if (score === null) return C.border;
  if (score >= 70) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

function getDayLabel(dateStr: string): string {
  const days = ["D", "L", "M", "X", "J", "V", "S"];
  try {
    const d = new Date(dateStr + "T00:00:00");
    return days[d.getDay()];
  } catch {
    return "?";
  }
}

export function HistoryBars({ data, selectedDate, onSelect }: HistoryBarsProps) {
  const maxScore = 100;
  const reversed = [...data].reverse();

  return (
    <div className="flex items-end gap-1.5 w-full h-20">
      {reversed.map((item) => {
        const height = item.score !== null ? Math.max((item.score / maxScore) * 52, 8) : 8;
        const color = barColor(item.score);
        const isSelected = selectedDate === item.date;
        const isToday = item.date === new Date().toISOString().split("T")[0];

        return (
          <div
            key={item.date}
            className="flex flex-col items-center gap-0.5 flex-1 cursor-pointer"
            onClick={() => onSelect?.(item.date)}
          >
            <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1, color: item.score !== null ? color : C.muted }}>
              {item.score !== null ? Math.round(item.score) : "—"}
            </span>

            <div className="flex-1 flex items-end w-full">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${height}px`,
                  backgroundColor: color,
                  opacity: isSelected ? 1 : 0.65,
                  boxShadow: isSelected ? `0 0 5px ${color}88` : "none",
                  border: isSelected ? `1px solid ${color}` : "none",
                }}
              />
            </div>

            <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1, color: isToday ? C.purple : C.muted }}>
              {isToday ? "HOY" : getDayLabel(item.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
