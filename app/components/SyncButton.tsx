"use client";

import { useState, useEffect, useRef } from "react";
import { C } from "@/app/lib/apex-tokens";

interface SyncStatus {
  status: "idle" | "starting" | "running" | "done" | "error";
  step?: string;
  new_activities?: number;
  days_back?: number;
  finished_at?: string;
  message?: string;
}

const STEP_LABELS: Record<string, string> = {
  "Conectando con Garmin...": "Conectando...",
  "Buscando actividades": "Buscando actividades...",
  "Procesando sueno...": "Procesando sueño...",
  "Procesando estado del dia...": "Procesando día...",
  "Calculando readiness y correlaciones...": "Calculando readiness...",
};

function humanStep(step: string | undefined): string {
  if (!step) return "Sincronizando...";
  for (const [key, label] of Object.entries(STEP_LABELS)) {
    if (step.startsWith(key)) return label;
  }
  return step.length > 35 ? step.slice(0, 35) + "…" : step;
}

export function SyncButton() {
  const [status, setStatus] = useState<SyncStatus>({ status: "idle" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async (): Promise<SyncStatus> => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const s = await res.json() as SyncStatus;
        setStatus(s);
        return s;
      }
    } catch { /* ignore */ }
    return { status: "idle" };
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      const s = await fetchStatus();
      if (s.status === "done" || s.status === "error" || s.status === "idle") {
        stopPolling();
      }
    }, 2500);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    try { return new Date(dateStr).toDateString() === new Date().toDateString(); }
    catch { return false; }
  };

  const triggerSync = (sections: string) => {
    fetch(`/api/sync?sections=${sections}`, { method: "POST" })
      .then(res => { if (res.ok) { setStatus({ status: "starting" }); startPolling(); } })
      .catch(() => {});
  };

  // Auto-sync por fases al abrir la app
  useEffect(() => {
    fetchStatus().then((s) => {
      if (s.status === "running" || s.status === "starting") {
        startPolling();
        return;
      }

      const sec = (s as unknown as Record<string, unknown>).sections as Record<string, Record<string, string>> | undefined;
      const needed: string[] = [];

      needed.push("day", "master");

      const sleepToday = isToday(sec?.sleep?.last_synced);
      if (!sleepToday) needed.push("sleep");

      needed.push("activities", "ftp", "profile");

      if (needed.length > 0) {
        triggerSync([...new Set(needed)].join(","));
      }
    });
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status.status !== "starting") return;
    const t = setTimeout(() => {
      setStatus({
        status: "error",
        message: "No respondió. Revisa /api/sync?log=1 para ver el error.",
      });
      stopPolling();
    }, 30000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.status]);

  const handleSync = async () => {
    try {
      const res = await fetch("/api/sync?sections=sleep,day,activities,master,ftp,profile", { method: "POST" });
      if (res.ok) {
        setStatus({ status: "starting" });
        startPolling();
      }
    } catch { /* ignore */ }
  };

  const isRunning = status.status === "running" || status.status === "starting";
  const isDone = status.status === "done";
  const isError = status.status === "error";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        onClick={handleSync}
        disabled={isRunning}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          background: isRunning ? C.border : isDone ? C.greenBg : C.card,
          border: `1px solid ${isRunning ? C.border : isDone ? C.green + "66" : C.border}`,
          color: isRunning ? C.muted : isDone ? C.green : C.secondary,
          cursor: isRunning ? "not-allowed" : "pointer",
          transition: "all 0.15s",
          boxShadow: C.shadow,
        }}
      >
        {isRunning ? (
          <>
            <span style={{
              display: "inline-block",
              width: 10, height: 10,
              border: `1.5px solid ${C.border}`,
              borderTopColor: C.purple,
              borderRadius: "50%",
              animation: "sync-spin 0.8s linear infinite",
              flexShrink: 0,
            }} />
            {humanStep(status.step)}
          </>
        ) : isDone ? (
          <>
            <span style={{ color: C.green }}>✓</span>
            {status.new_activities
              ? `${status.new_activities} nueva${status.new_activities !== 1 ? "s" : ""}`
              : "Al día"}
          </>
        ) : isError ? (
          <>
            <span style={{ color: C.red }}>!</span>
            Reintentar
          </>
        ) : (
          <>
            <span style={{ fontSize: 13 }}>↻</span>
            Actualizar
          </>
        )}
      </button>

      {isError && status.message && (
        <p style={{ fontSize: 10, color: C.red, maxWidth: 180, textAlign: "right", lineHeight: 1.4, margin: 0 }}>
          {status.message}
        </p>
      )}

      <style>{`
        @keyframes sync-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
