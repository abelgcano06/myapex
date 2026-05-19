"use client";

import { useState, useEffect } from "react";
import { DeepAnalysisModal } from "../components/DeepAnalysisModal";
import { ApexChat } from "../components/ApexChat";
import { ScoreRing } from "../components/ScoreRing";
import { C, triColor } from "@/app/lib/apex-tokens";
import {
  ApexStyles, Card, ApexBadge, MetricCard, SectionHead,
  AiLoadingCard, ShimmerSkeleton, PageNav, CorrelationsCard,
} from "@/app/components/ApexUI";

// ── Types ──────────────────────────────────────────────────────────────────
interface AiSystem { name: string; score: number; status: string; message: string; }
interface AiCorrelation { systems: string[]; root_cause: string; insight: string; severity: "high" | "medium"; }

interface DayBriefAI {
  hero?:          { score: number; status: string; headline: string };
  systems?:       AiSystem[];
  today?:         { performance: string; action: string };
  pattern?:       { message: string };
  correlations?:  AiCorrelation[];
  deep_analysis?: Record<string, unknown>;
}

interface DayAnalysis {
  recovery_summary: {
    overall_day_state_score: number;
    system_strain_score?:    number;
    day_capacity_score?:     number;
    primary_limiter?:        string;
  };
  energy_dynamics: {
    body_battery_start:    number;
    body_battery_end:      number;
    body_battery_change:   number;
    body_battery_min:      number;
    body_battery_max:      number;
    energy_dynamics_score: number;
  };
  nervous_system_load: {
    avg_stress:                number;
    avg_hr:                    number;
    resting_hr?:               number;
    nervous_system_load_score: number;
  };
  physical_load: {
    steps:               number;
    intensity_minutes:   number;
    active_calories?:    number;
    physical_load_score: number;
  };
  recovery_response:  { recovery_response_score: number };
  cognitive_load:     { cognitive_load_score: number; sedentary_ratio?: number };
  respiratory?:       { avg_respiration?: number; respiratory_score?: number };
}

interface DayHistoryRow { calendar_date: string; overall_day_state_score: number; }

interface DayPageData {
  date:     string;
  analysis: DayAnalysis | null;
  brief_ai: DayBriefAI | null;
}

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtDatePill(d: string) {
  try {
    const dt = new Date(d + "T00:00:00");
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `${dt.getDate()} ${months[dt.getMonth()]}`;
  } catch { return d.slice(5); }
}

function sysColor(score: number) {
  if (score >= 7) return C.green;
  if (score >= 5) return C.amber;
  return C.red;
}

// ── Raw data ───────────────────────────────────────────────────────────────
function DataRow({ l, v }: { l: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.secondary }}>{l}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v}</span>
    </div>
  );
}
function DataSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
function RawData({ a }: { a: DayAnalysis }) {
  const ed  = a.energy_dynamics;
  const nsl = a.nervous_system_load;
  const pl  = a.physical_load;
  return (
    <div>
      <DataSection label="Score general">
        <DataRow l="Score día" v={`${Math.round(a.recovery_summary.overall_day_state_score)}/100`} />
        {a.recovery_summary.day_capacity_score != null && <DataRow l="Capacidad del día" v={`${Math.round(a.recovery_summary.day_capacity_score)}/100`} />}
        {a.recovery_summary.system_strain_score != null && <DataRow l="Tensión del sistema" v={`${Math.round(a.recovery_summary.system_strain_score)}/100`} />}
        {a.recovery_summary.primary_limiter && <DataRow l="Limitante principal" v={a.recovery_summary.primary_limiter} />}
      </DataSection>
      <DataSection label="Body Battery">
        <DataRow l="Inicio" v={`${ed.body_battery_start}`} />
        <DataRow l="Mínimo" v={`${ed.body_battery_min}`} />
        <DataRow l="Máximo" v={`${ed.body_battery_max}`} />
        <DataRow l="Final"  v={`${ed.body_battery_end}`} />
        <DataRow l="Cambio" v={`${ed.body_battery_change >= 0 ? "+" : ""}${Math.round(ed.body_battery_change)} pts`} />
      </DataSection>
      <DataSection label="Sistema nervioso y estrés">
        <DataRow l="Estrés promedio"  v={`${Math.round(nsl.avg_stress)}`} />
        <DataRow l="FC promedio"      v={`${Math.round(nsl.avg_hr)} bpm`} />
        {nsl.resting_hr != null && <DataRow l="FC en reposo" v={`${Math.round(nsl.resting_hr)} bpm`} />}
        <DataRow l="Score SNA (Apex)" v={`${Math.round(nsl.nervous_system_load_score)}/100`} />
      </DataSection>
      <DataSection label="Carga física">
        <DataRow l="Pasos"              v={pl.steps.toLocaleString()} />
        <DataRow l="Minutos intensidad" v={`${Math.round(pl.intensity_minutes)} min`} />
        {pl.active_calories != null && <DataRow l="Calorías activas" v={`${Math.round(pl.active_calories)} kcal`} />}
        <DataRow l="Score carga física" v={`${Math.round(pl.physical_load_score)}/100`} />
      </DataSection>
      <DataSection label="Otros scores Apex">
        <DataRow l="Recuperación" v={`${Math.round(a.recovery_response.recovery_response_score)}/100`} />
        <DataRow l="Carga mental" v={`${Math.round(a.cognitive_load.cognitive_load_score)}/100`} />
        <DataRow l="Energía"      v={`${Math.round(ed.energy_dynamics_score)}/100`} />
        {a.respiratory?.respiratory_score != null && <DataRow l="Respiración" v={`${Math.round(a.respiratory.respiratory_score)}/100`} />}
      </DataSection>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DayPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate]     = useState(today);
  const [data, setData]                     = useState<DayPageData | null>(null);
  const [history, setHistory]               = useState<DayHistoryRow[]>([]);
  const [loading, setLoading]               = useState(true);
  const [aiLoading, setAiLoading]           = useState(false);
  const [deepResult, setDeepResult]         = useState<Record<string, unknown> | null>(null);
  const [deepOpen, setDeepOpen]             = useState(false);
  const [dataExpanded, setDataExpanded]     = useState(false);
  const [generatingDeep, setGeneratingDeep] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetch("/api/history?section=day")
      .then(r => r.json())
      .then((rows: DayHistoryRow[]) => {
        setHistory(rows);
        if (rows.length > 0) setSelectedDate(rows[rows.length - 1].calendar_date);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setAiLoading(false);
    setDeepResult(null);
    setDeepOpen(false);
    setDataExpanded(false);
    fetch(`/api/day?date=${selectedDate}`)
      .then(r => r.json())
      .then((d: DayPageData) => {
        setData(d);
        setLoading(false);
        if (!d.brief_ai && d.analysis) {
          setAiLoading(true);
          fetch(`/api/ai/day-brief?date=${selectedDate}`)
            .then(r => r.json())
            .then(b => {
              if (b.ok && b.brief) setData(prev => prev ? { ...prev, brief_ai: b.brief as DayBriefAI } : prev);
            })
            .catch(() => {})
            .finally(() => setAiLoading(false));
        }
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  async function handleDeepAnalysis() {
    if (deepResult) { setDeepOpen(true); return; }
    setGeneratingDeep(true);
    try {
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "day", date: selectedDate, type: "deep" }),
      });
      const d = await res.json();
      const content = d.content ?? d;
      if (content && typeof content === "object") { setDeepResult(content as Record<string, unknown>); setDeepOpen(true); }
    } catch { /* ignore */ }
    finally { setGeneratingDeep(false); }
  }

  const a      = data?.analysis ?? null;
  const ai     = data?.brief_ai ?? null;
  const score  = a?.recovery_summary.overall_day_state_score ?? null;
  const ed     = a?.energy_dynamics;
  const nsl    = a?.nervous_system_load;
  const pl     = a?.physical_load;
  const hasData = a != null;
  const dates   = history.map(r => r.calendar_date);
  const veredicto = ai?.hero?.status
    ?? (score != null ? (score >= 70 ? "Día sólido" : score >= 50 ? "Día exigente" : "Capacidad limitada") : "—");

  const bbSt     = ed  ? triColor(ed.body_battery_change, 10, -10) : null;
  const stressSt = nsl ? triColor(nsl.avg_stress, 25, 40, false) : null;
  const stepsSt  = pl  ? triColor(pl.steps, 8000, 4000) : null;
  const intensSt = pl  ? triColor(pl.intensity_minutes, 30, 10) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 80 }}>
      <ApexStyles />

      <PageNav title="Día" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>

        {/* DATE PILLS */}
        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 16, scrollbarWidth: "none" }}>
            {[...dates].reverse().map(date => {
              const active = date === selectedDate;
              return (
                <button key={date} onClick={() => setSelectedDate(date)} style={{
                  flexShrink: 0, borderRadius: 99, padding: "5px 12px",
                  background: active ? C.purple : C.card,
                  color: active ? "#fff" : C.muted,
                  border: `1px solid ${active ? C.purple : C.border}`,
                  fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
                }}>
                  {fmtDatePill(date)}
                </button>
              );
            })}
          </div>
        )}

        {loading && <ShimmerSkeleton heights={[120, 80, 180, 140, 100]} />}

        {!loading && !hasData && (
          <Card>
            <p style={{ color: C.muted, textAlign: "center", fontSize: 14, margin: 0 }}>Sin datos para este día.</p>
          </Card>
        )}

        {!loading && hasData && a && (
          <>
            {/* ── 1. HERO ── */}
            <Card style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <ScoreRing score={score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.25, marginBottom: 6 }}>
                    {veredicto}
                  </div>
                  {ai?.hero?.headline && (
                    <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5, margin: "0 0 10px" }}>
                      {ai.hero.headline}
                    </p>
                  )}
                  {a.recovery_summary.primary_limiter && (
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, background: C.amberBg, color: C.amber, padding: "3px 8px", borderRadius: 20 }}>
                      Limitante: {a.recovery_summary.primary_limiter.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* ── 2. MÉTRICAS ── */}
            {ed && nsl && pl && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <MetricCard color={bbSt!.color} bg={bbSt!.bg} label="BODY BATTERY"
                  value={`${ed.body_battery_change >= 0 ? "+" : ""}${Math.round(ed.body_battery_change)}`}
                  sub={`${ed.body_battery_start} → ${ed.body_battery_end}`} />
                <MetricCard color={stressSt!.color} bg={stressSt!.bg} label="ESTRÉS PROM."
                  value={`${Math.round(nsl.avg_stress)}`}
                  sub={`FC prom. ${Math.round(nsl.avg_hr)} bpm`} />
                <MetricCard color={stepsSt!.color} bg={stepsSt!.bg} label="PASOS"
                  value={`${(pl.steps / 1000).toFixed(1)}k`}
                  sub={pl.active_calories != null ? `${Math.round(pl.active_calories)} kcal` : "pasos hoy"} />
                <MetricCard color={intensSt!.color} bg={intensSt!.bg} label="INTENSIDAD"
                  value={`${Math.round(pl.intensity_minutes)} min`}
                  sub="minutos activos" />
              </div>
            )}

            {/* ── 3. AI LOADING / RECOMENDACIÓN ── */}
            {aiLoading && !ai && <AiLoadingCard />}

            {ai?.today?.action && (
              <Card style={{ marginBottom: 12, background: C.purpleLight, border: `1px solid ${C.purple}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ApexBadge />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Recomendación de hoy</span>
                </div>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: "0 0 6px" }}>{ai.today.action}</p>
                {ai.today.performance && (
                  <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5, margin: 0 }}>{ai.today.performance}</p>
                )}
              </Card>
            )}

            {/* ── 4. POR QUÉ ── */}
            {ai?.systems && ai.systems.length > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <SectionHead>Por qué</SectionHead>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {ai.systems.map(sys => {
                    const pct   = (sys.score / 10) * 100;
                    const color = sysColor(sys.score);
                    return (
                      <div key={sys.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{sys.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{sys.score.toFixed(1)}/10</span>
                        </div>
                        <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
                        </div>
                        {(sys.status === "down" || sys.status === "warning") && sys.message && (
                          <p style={{ fontSize: 11, color: C.secondary, margin: "4px 0 0", lineHeight: 1.4 }}>{sys.message}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── 5. SEÑALES CONECTADAS ── */}
            {ai?.correlations && ai.correlations.length > 0 && (
              <CorrelationsCard correlations={ai.correlations} />
            )}

            {/* ── 6. BODY BATTERY RANGO ── */}
            {ed && (
              <Card style={{ marginBottom: 12 }}>
                <SectionHead>Body Battery</SectionHead>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
                  {([
                    { label: "Inicio", val: ed.body_battery_start },
                    { label: "Mínimo", val: ed.body_battery_min },
                    { label: "Máximo", val: ed.body_battery_max },
                    { label: "Final",  val: ed.body_battery_end },
                  ] as const).map(m => (
                    <div key={m.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      position: "absolute",
                      left: `${ed.body_battery_min}%`,
                      width: `${Math.max(ed.body_battery_max - ed.body_battery_min, 2)}%`,
                      height: "100%", background: C.purpleLight, borderRadius: 4,
                    }} />
                    <div style={{ position: "absolute", left: `${Math.min(ed.body_battery_end, 97)}%`, width: 3, height: "100%", background: C.purple }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, flexShrink: 0, color: ed.body_battery_change >= 0 ? C.green : C.red }}>
                    {ed.body_battery_change >= 0 ? "+" : ""}{Math.round(ed.body_battery_change)} pts
                  </span>
                </div>
              </Card>
            )}

            {/* ── 7. PATRÓN PERSONAL ── */}
            {ai?.pattern?.message && (
              <Card style={{ marginBottom: 12, background: C.purpleLight, border: `1px solid ${C.purple}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ApexBadge />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Patrón personal</span>
                </div>
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>{ai.pattern.message}</p>
              </Card>
            )}

            {/* ── 8. HISTORY BARS ── */}
            {history.length > 1 && (
              <Card style={{ marginBottom: 12 }}>
                <SectionHead>Últimos {Math.min(history.length, 20)} días</SectionHead>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 36 }}>
                  {history.slice(-20).map((h, i) => {
                    const isSelected = h.calendar_date === selectedDate;
                    const pct = (h.overall_day_state_score ?? 0) / 100;
                    const col = h.overall_day_state_score >= 65 ? C.green : h.overall_day_state_score >= 45 ? C.amber : C.red;
                    return (
                      <button key={i} onClick={() => setSelectedDate(h.calendar_date)} title={h.calendar_date} style={{
                        flex: 1, height: `${Math.max(pct * 36, 4)}px`,
                        borderRadius: 3, background: isSelected ? C.purple : col,
                        opacity: isSelected ? 1 : 0.55, border: "none", cursor: "pointer", padding: 0, transition: "all 0.15s",
                      }} />
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── 9. BOTONES ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setChatOpen(true)}
                style={{
                  width: "100%", padding: 14,
                  background: C.purple, color: "#fff",
                  border: "none", borderRadius: 12,
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >
                💬 Hablar con IA
              </button>
              <button
                onClick={handleDeepAnalysis}
                disabled={generatingDeep}
                style={{
                  width: "100%", padding: 12,
                  background: C.purpleLight, color: C.purpleText,
                  border: "none", borderRadius: 12,
                  fontSize: 14, fontWeight: 600, cursor: generatingDeep ? "default" : "pointer",
                  opacity: generatingDeep ? 0.7 : 1,
                }}
              >
                {generatingDeep ? "Analizando..." : "Análisis profundo →"}
              </button>
              <button
                onClick={() => setDataExpanded(!dataExpanded)}
                style={{
                  width: "100%", padding: 12,
                  background: "transparent", color: C.secondary,
                  border: `1px solid ${C.border}`, borderRadius: 12,
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
              >
                {dataExpanded ? "▲ Ocultar datos" : "▼ Ver toda la data"}
              </button>
            </div>

            {/* ── 10. RAW DATA ── */}
            {dataExpanded && (
              <Card style={{ marginBottom: 24 }}>
                <RawData a={a} />
              </Card>
            )}
          </>
        )}
      </div>

      {deepResult && deepOpen && (
        <DeepAnalysisModal
          content={deepResult as unknown as Parameters<typeof DeepAnalysisModal>[0]["content"]}
          onClose={() => setDeepOpen(false)}
        />
      )}

      {chatOpen && data && (
        <ApexChat
          section="day"
          context={{ date: selectedDate, analysis: data.analysis, brief_ai: data.brief_ai }}
          subtitle={`${selectedDate} · Score ${Math.round(score ?? 0)}`}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
