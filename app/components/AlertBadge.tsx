"use client";

interface AlertBadgeProps {
  label: string;
}

export function AlertBadge({ label }: AlertBadgeProps) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        color: "#ef4444",
        border: "1px solid rgba(239, 68, 68, 0.3)",
      }}
    >
      {label}
    </span>
  );
}
