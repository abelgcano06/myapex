"use client";

import { useState } from "react";
import { ApexLoader } from "./ApexLoader";

interface AIButtonsProps {
  section: "sleep" | "day" | "activity" | "master";
  date?: string;
  activityId?: string;
  quickExists?: boolean;
  deepExists?: boolean;
  onResult?: (data: Record<string, unknown>) => void;
  onDeepResult?: (data: Record<string, unknown>) => void;
  onDeepOpen?: () => void;
}

export function AIButtons({
  section,
  date,
  activityId,
  quickExists = false,
  deepExists = false,
  onResult,
  onDeepResult,
  onDeepOpen,
}: AIButtonsProps) {
  const [loading, setLoading] = useState<"quick" | "deep" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick(type: "quick" | "deep") {
    setLoading(type);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, date, id: activityId, type }),
      });
      const data = await res.json();
      if (data.pending) {
        setMessage(data.message || "Análisis en proceso. Vuelve pronto.");
      } else if (data.error) {
        setMessage(data.error);
      } else {
        if (type === "deep") {
          onDeepResult?.(data);
        } else {
          onResult?.(data);
        }
      }
    } catch {
      setMessage("Error al cargar análisis.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Apex loader overlay while processing */}
      {loading && (
        <div
          className="rounded-xl mb-1"
          style={{ background: "#0d1a0d", border: "1px solid #1a3a1a" }}
        >
          <ApexLoader type={loading} />
        </div>
      )}

      <div className="flex gap-3">
        {/* Quick */}
        <button
          onClick={() => handleClick("quick")}
          disabled={loading !== null || quickExists}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:cursor-default"
          style={{
            border: `1px solid ${quickExists ? "#1a3a1a" : "#22c55e"}`,
            color: quickExists ? "#3a7a3a" : "#22c55e",
            backgroundColor: quickExists ? "#0a1a0a" : "transparent",
          }}
        >
          {quickExists ? "✓ Análisis Rápido" : "Análisis Rápido"}
        </button>

        {/* Deep */}
        <button
          onClick={() => deepExists ? onDeepOpen?.() : handleClick("deep")}
          disabled={loading !== null}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:cursor-default"
          style={{
            border: `1px solid ${deepExists ? "#1a3a1a" : "#2a2a2a"}`,
            color: deepExists ? "#3a7a3a" : "#888888",
            backgroundColor: deepExists ? "#0a1a0a" : "transparent",
          }}
        >
          {deepExists ? "✓ Análisis Completo" : "Análisis Completo"}
        </button>
      </div>

      {message && (
        <p className="text-xs text-[#888888] text-center">{message}</p>
      )}
    </div>
  );
}
