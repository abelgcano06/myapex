"use client";

interface DatePillsProps {
  dates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

function formatPillDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDate();
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `${day} ${months[d.getMonth()]}`;
  } catch {
    return dateStr;
  }
}

export function DatePills({ dates, selectedDate, onSelect }: DatePillsProps) {
  const reversed = [...dates].reverse();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {reversed.map((date) => {
        const isSelected = date === selectedDate;
        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: isSelected ? "#2C2C2A" : "transparent",
              color: isSelected ? "#FFFFFF" : "#888780",
              border: `1px solid ${isSelected ? "#2C2C2A" : "#E8E7E4"}`,
            }}
          >
            {formatPillDate(date)}
          </button>
        );
      })}
    </div>
  );
}
