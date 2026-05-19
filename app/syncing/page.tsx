"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/app/lib/apex-tokens";

interface SyncStatus {
  status: "idle" | "starting" | "running" | "done" | "error";
  step?: string;
  new_activities?: number;
  days_back?: number;
  finished_at?: string;
  message?: string;
}

const STEP_MAP: Array<{ match: string; label: string; sub: string }> = [
  { match: "Conectando",            label: "Conectando con Garmin",         sub: "Verificando credenciales..." },
  { match: "Actualizando FTP",      label: "Calibrando potencia",           sub: "Calculando tu FTP actualizado..." },
  { match: "actividades",           label: "Sincronizando actividades",      sub: "Descargando y analizando rides..." },
  { match: "sueno",                 label: "Analizando sueño",              sub: "Procesando recuperación nocturna..." },
  { match: "estado del dia",        label: "Procesando estado del día",     sub: "Métricas HRV, estrés y energía..." },
  { match: "readiness",             label: "Calculando Readiness",          sub: "Correlaciones y score final..." },
  { match: "Recalculando FTP",      label: "Actualizando FTP",              sub: "Incorporando actividades nuevas..." },
  { match: "Perfil",                label: "Actualizando perfil",           sub: "Baselines y contexto del atleta..." },
];

function resolveStep(raw: string | undefined): { label: string; sub: string } {
  if (!raw) return { label: "Iniciando motores", sub: "Preparando el análisis..." };
  const lower = raw.toLowerCase();
  for (const s of STEP_MAP) {
    if (lower.includes(s.match.toLowerCase())) return { label: s.label, sub: s.sub };
  }
  return { label: "Procesando", sub: raw.length > 60 ? raw.slice(0, 60) + "…" : raw };
}

function Bars({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 40 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            borderRadius: 3,
            background: active ? C.purple : C.border,
            animation: active ? `pulse-bar 1.1s ease-in-out ${i * 0.15}s infinite` : "none",
            height: active ? undefined : 10,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse-bar {
          0%, 100% { height: 10px; opacity: 0.5; }
          50%       { height: 40px; opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

export default function SyncingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus>({ status: "starting" });
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    const triggerAndPoll = async () => {
      try {
        await fetch("/api/sync", { method: "POST" });
      } catch { /* ignorar */ }

      intervalRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/sync");
          if (!res.ok) return;
          const s: SyncStatus = await res.json();
          setStatus(s);

          if (s.status === "done") {
            clearInterval(intervalRef.current!);
            clearInterval(timerRef.current!);
            setTimeout(() => router.replace("/"), 1200);
          } else if (s.status === "error") {
            clearInterval(intervalRef.current!);
            clearInterval(timerRef.current!);
          }
        } catch { /* ignorar */ }
      }, 2500);
    };

    triggerAndPoll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current)   clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = status.status === "starting" || status.status === "running";
  const isDone    = status.status === "done";
  const isError   = status.status === "error";

  const { label, sub } = isDone
    ? { label: "Todo al día", sub: status.new_activities ? `${status.new_activities} actividad${status.new_activities !== 1 ? "es" : ""} nueva${status.new_activities !== 1 ? "s" : ""}` : "Sin actividades nuevas" }
    : isError
    ? { label: "Error al sincronizar", sub: status.message ?? "Revisa tu conexión e inténtalo de nuevo." }
    : resolveStep(status.step);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedStr = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")} min` : `${secs}s`;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: C.bg,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, width: "100%", maxWidth: 300, textAlign: "center" }}>

        {/* Logo */}
        <div>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: C.purple,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            fontSize: 24,
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>My Apex</h1>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Performance Intelligence</p>
        </div>

        {/* Barras animadas */}
        <Bars active={isRunning} />

        {/* Step label */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: isDone ? C.green : isError ? C.red : C.text, margin: 0 }}>
            {isDone ? "✓ " : isError ? "✕ " : ""}{label}
          </p>
          <p style={{ fontSize: 14, color: C.secondary, lineHeight: 1.6, margin: 0 }}>
            {sub}
          </p>
        </div>

        {/* Barra de progreso indeterminada */}
        {isRunning && (
          <div style={{ width: "100%", height: 3, borderRadius: 2, background: C.border, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: C.purple,
              borderRadius: 2,
              animation: "sync-slide 1.8s ease-in-out infinite",
            }} />
            <style>{`
              @keyframes sync-slide {
                0%   { width: 0%;   margin-left: 0; }
                50%  { width: 60%;  margin-left: 20%; }
                100% { width: 0%;   margin-left: 100%; }
              }
            `}</style>
          </div>
        )}

        {/* Tiempo transcurrido */}
        {isRunning && elapsed > 3 && (
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{elapsedStr}</p>
        )}

        {/* Error: botón volver */}
        {isError && (
          <button
            onClick={() => router.replace("/login")}
            style={{
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: C.card, border: `1px solid ${C.border}`,
              color: C.secondary, cursor: "pointer",
              boxShadow: C.shadow,
            }}
          >
            Volver al inicio
          </button>
        )}
      </div>
    </div>
  );
}
