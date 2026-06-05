"use client";

import { useState, useEffect } from "react";
import { DeepAnalysisModal } from "../components/DeepAnalysisModal";
import { ApexChat } from "../components/ApexChat";
import { C } from "@/app/lib/apex-tokens";
import {
  ApexStyles, Card, ApexBadge, SectionHead,
  AiLoadingCard, ShimmerSkeleton, PageNav,
} from "@/app/components/ApexUI";

// ── Types ──────────────────────────────────────────────────────────────────
interface DayBriefAI {
  hero?:         { score: number; status: string; headline: string };
  systems?:      { name: string; score: number; status: string; message: string }[];
  today?:        { performance: string; action: string };
  pattern?:      { message: string };
  correlations?: { systems: string[]; root_cause: string; insight: string; severity: string }[];
}

interface TrainingLoad { atl?: number; ctl?: number; tsb?: number; tsb_label?: string }

interface DayAnalysis {
  recovery_summary: {
    overall_day_state_score: number;
    system_strain_score?:    number;
    day_capacity_score?:     number;
    nervous_system_load_score?: number;
    energy_dynamics_score?:  number;
    primary_limiter?:        string;
    secondary_limiter?:      string;
  };
  energy_dynamics: {
    body_battery_start:    number;
    body_battery_end:      number;
    body_battery_change:   number;
    body_battery_min:      number;
    body_battery_max:      number;
    energy_dynamics_score: number;
    recharge_events?:      number;
    crash_events?:         number;
    body_battery_slope?:   number;
  };
  nervous_system_load: {
    avg_stress:                number;
    max_stress?:               number;
    avg_hr:                    number;
    resting_hr?:               number;
    avg_hrv?:                  number;
    nervous_system_load_score: number;
    stress_spike_count?:       number;
    high_stress_ratio?:        number;
  };
  physical_load: {
    steps:               number;
    intensity_minutes:   number;
    active_calories?:    number;
    physical_load_score: number;
  };
  recovery_response: {
    recovery_response_score: number;
    downshift_count?:        number;
    downshift_ratio?:        number;
    max_relief?:             number;
  };
  cognitive_load?:   { cognitive_load_score: number; sedentary_ratio?: number };
  respiratory?:      { avg_respiration?: number; respiratory_score?: number };
  training_load?:    TrainingLoad;
}

interface DayPageData { date: string; analysis: DayAnalysis | null; brief_ai: DayBriefAI | null; }
interface DayHistoryRow { calendar_date: string; overall_day_state_score: number; tsb?: number; }

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDatePill(d: string) {
  try {
    const dt = new Date(d + "T00:00:00");
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `${dt.getDate()} ${months[dt.getMonth()]}`;
  } catch { return d.slice(5); }
}

function clr(val: number, good: number, bad: number, higherIsBetter = true) {
  if (higherIsBetter) return val >= good ? C.green : val >= bad ? C.amber : C.red;
  return val <= good ? C.green : val <= bad ? C.amber : C.red;
}

function DataRow({ l, v, highlight }: { l: string; v: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.secondary }}>{l}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 600, color: highlight ? C.purple : C.text }}>{v}</span>
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

// ── TSB Chip ───────────────────────────────────────────────────────────────
function TSBChip({ tsb, label }: { tsb?: number; label?: string }) {
  let text = label ?? (tsb == null ? "—" : tsb > 5 ? "Fresco" : tsb >= -10 ? "Neutro" : "Fatigado");
  let bg   = C.card;
  let col  = C.muted;
  if (tsb != null) {
    if (tsb > 5)    { bg = `${C.green}22`;  col = C.green; }
    else if (tsb >= -10) { bg = `${C.amber}22`; col = C.amber; }
    else            { bg = `${C.red}22`;    col = C.red; }
  }
  return (
    <span style={{ background: bg, color: col, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, border: `1px solid ${col}44` }}>
      {text}
    </span>
  );
}

// ── BB Arc (visual del día) ────────────────────────────────────────────────
function BBDayArc({ start, end, min, max }: { start: number; end: number; min: number; max: number }) {
  const scale = (v: number) => `${Math.min(Math.max(v, 0), 100)}%`;
  const delta = end - start;
  const deltaColor = delta >= 0 ? C.green : C.red;
  return (
    <div style={{ position: "relative", height: 56, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {/* Track */}
      <div style={{ height: 10, background: C.border, borderRadius: 6, position: "relative", overflow: "hidden" }}>
        {/* Range min→max */}
        <div style={{
          position: "absolute",
          left: scale(min), width: `${Math.max(max - min, 2)}%`,
          height: "100%", background: `${C.purple}33`, borderRadius: 6,
        }} />
        {/* Start marker */}
        <div style={{ position: "absolute", left: `calc(${scale(start)} - 1px)`, width: 3, height: "100%", background: C.purple, opacity: 0.5 }} />
        {/* End marker */}
        <div style={{ position: "absolute", left: `calc(${scale(end)} - 2px)`, width: 5, height: "100%", background: C.purple, borderRadius: 3 }} />
      </div>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.muted }}>Despertaste</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{start}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.muted }}>Mín</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.red }}>{min}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.muted }}>Ahora</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>{end}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: deltaColor }}>{delta >= 0 ? "+" : ""}{Math.round(delta)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Mini score bar ─────────────────────────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.secondary }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(value)}/100</span>
      </div>
      <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DayPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData]                 = useState<DayPageData | null>(null);
  const [history, setHistory]           = useState<DayHistoryRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [aiLoading, setAiLoading]       = useState(false);
  const [deepResult, setDeepResult]     = useState<Record<string, unknown> | null>(null);
  const [deepOpen, setDeepOpen]         = useState(false);
  const [dataExpanded, setDataExpanded] = useState(false);
  const [generatingDeep, setGeneratingDeep] = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);

  useEffect(() => {
    fetch("/api/history?section=day&days=60")
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
            .then(b => { if (b.ok && b.brief) setData(prev => prev ? { ...prev, brief_ai: b.brief as DayBriefAI } : prev); })
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

  const a   = data?.analysis ?? null;
  const ai  = data?.brief_ai ?? null;
  const ed  = a?.energy_dynamics;
  const nsl = a?.nervous_system_load;
  const pl  = a?.physical_load;
  const rr  = a?.recovery_response;
  const tl  = a?.training_load;
  const tsb = tl?.tsb;

  // Decisión de entrenamiento basada en TSB + nervous load + BB
  function getTrainingRec() {
    if (!a) return null;
    const nslScore = nsl?.nervous_system_load_score ?? 50;
    const bbEnd    = ed?.body_battery_end ?? 50;
    if (tsb != null && tsb > 10 && nslScore >= 60 && bbEnd >= 50)
      return { text: "Condiciones óptimas para entrenar con carga alta.", color: C.green };
    if (tsb != null && tsb < -20 || nslScore < 35 || (bbEnd != null && bbEnd < 25))
      return { text: "Sistema bajo carga alta. Solo recuperación activa o descanso.", color: C.red };
    return { text: "Puedes entrenar con carga moderada. Escucha cómo responde el cuerpo.", color: C.amber };
  }
  const rec = getTrainingRec();

  const tsbLabel = tl?.tsb_label ?? (tsb == null ? "—" : tsb > 5 ? "Fresco" : tsb >= -10 ? "Neutro" : "Fatigado");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 80 }}>
      <ApexStyles />
      <PageNav title="Día" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>

        {/* DATE PILLS */}
        {history.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 16, scrollbarWidth: "none" }}>
            {[...history].reverse().map(h => {
              const active = h.calendar_date === selectedDate;
              return (
                <button key={h.calendar_date} onClick={() => setSelectedDate(h.calendar_date)} style={{
                  flexShrink: 0, borderRadius: 99, padding: "5px 12px",
                  background: active ? C.purple : C.card,
                  color: active ? "#fff" : C.muted,
                  border: `1px solid ${active ? C.purple : C.border}`,
                  fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
                }}>
                  {fmtDatePill(h.calendar_date)}
                </button>
              );
            })}
          </div>
        )}

        {loading && <ShimmerSkeleton heights={[100, 80, 120, 80, 100, 80]} />}
        {!loading && !a && (
          <Card><p style={{ color: C.muted, textAlign: "center", fontSize: 14, margin: 0 }}>Sin datos para este día.</p></Card>
        )}

        {!loading && a && (
          <>
            {/* ── 1. ASÍ DESPERTASTE ── */}
            <Card style={{ marginBottom: 12 }}>
              <SectionHead>Así despertaste</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {ed && (
                  <div style={{ textAlign: "center", background: C.bg, borderRadius: 10, padding: "10px 6px" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Body Battery</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{ed.body_battery_start}</div>
                    <div style={{ fontSize: 10, color: C.secondary }}>al despertar</div>
                  </div>
                )}
                {nsl?.resting_hr && (
                  <div style={{ textAlign: "center", background: C.bg, borderRadius: 10, padding: "10px 6px" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>FC Reposo</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{Math.round(nsl.resting_hr)}</div>
                    <div style={{ fontSize: 10, color: C.secondary }}>bpm</div>
                  </div>
                )}
                {a.respiratory?.avg_respiration && (
                  <div style={{ textAlign: "center", background: C.bg, borderRadius: 10, padding: "10px 6px" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Respiración</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{a.respiratory.avg_respiration.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: C.secondary }}>rpm</div>
                  </div>
                )}
              </div>
            </Card>

            {/* ── 2. FORMA DEL DÍA (TSB) ── */}
            <Card style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <SectionHead style={{ margin: 0 }}>Forma del día</SectionHead>
                <TSBChip tsb={tsb} label={tsbLabel} />
              </div>
              {tl && (tl.ctl != null || tl.atl != null) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                  {([
                    { label: "CTL (forma)", val: tl.ctl, good: 40, bad: 20 },
                    { label: "ATL (fatiga)", val: tl.atl, good: 20, bad: 40, inv: true },
                    { label: "TSB (balance)", val: tl.tsb, good: 5, bad: -15 },
                  ] as const).map(m => m.val != null && (
                    <div key={m.label} style={{ textAlign: "center", background: C.bg, borderRadius: 10, padding: "8px 4px" }}>
                      <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{m.val.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              )}
              {!tl?.ctl && !tl?.atl && (
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Necesitas más actividades con potenciómetro para calcular tu carga de entrenamiento.</p>
              )}
            </Card>

            {/* ── 3. SISTEMA NERVIOSO ── */}
            {nsl && (
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <SectionHead style={{ margin: 0 }}>Sistema nervioso</SectionHead>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: clr(nsl.nervous_system_load_score, 65, 40),
                    background: `${clr(nsl.nervous_system_load_score, 65, 40)}22`,
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    {nsl.nervous_system_load_score >= 65 ? "Recuperado" : nsl.nervous_system_load_score >= 40 ? "Moderado" : "Cargado"}
                  </span>
                </div>
                <ScoreBar label="Carga del SNA" value={nsl.nervous_system_load_score} color={clr(nsl.nervous_system_load_score, 65, 40)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted }}>Estrés prom.</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: clr(nsl.avg_stress, 25, 40, false) }}>{Math.round(nsl.avg_stress)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted }}>FC promedio</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{Math.round(nsl.avg_hr)} bpm</div>
                  </div>
                  {nsl.stress_spike_count != null && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.muted }}>Picos estrés</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: nsl.stress_spike_count > 5 ? C.red : C.text }}>{nsl.stress_spike_count}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* ── 4. CURVA DEL DÍA (Body Battery arc) ── */}
            {ed && (
              <Card style={{ marginBottom: 12 }}>
                <SectionHead>Curva del día — Body Battery</SectionHead>
                <BBDayArc start={ed.body_battery_start} end={ed.body_battery_end} min={ed.body_battery_min} max={ed.body_battery_max} />
                {(ed.recharge_events != null || ed.crash_events != null) && (
                  <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                    {ed.recharge_events != null && (
                      <span style={{ fontSize: 12, color: C.green }}>↑ {ed.recharge_events} recarga{ed.recharge_events !== 1 ? "s" : ""}</span>
                    )}
                    {ed.crash_events != null && ed.crash_events > 0 && (
                      <span style={{ fontSize: 12, color: C.red }}>↓ {ed.crash_events} caída{ed.crash_events !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* ── 5. CÓMO VAS AHORITA ── */}
            <Card style={{ marginBottom: 12 }}>
              <SectionHead>Cómo vas ahorita</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {pl && (
                  <>
                    <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Pasos</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: clr(pl.steps, 8000, 4000) }}>{(pl.steps / 1000).toFixed(1)}k</div>
                      {pl.active_calories != null && <div style={{ fontSize: 10, color: C.secondary }}>{Math.round(pl.active_calories)} kcal activas</div>}
                    </div>
                    <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Intensidad</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: clr(pl.intensity_minutes, 30, 10) }}>{Math.round(pl.intensity_minutes)} min</div>
                      <div style={{ fontSize: 10, color: C.secondary }}>minutos activos</div>
                    </div>
                  </>
                )}
              </div>
              {rr && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.secondary }}>Eventos de recuperación</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Veces que el cuerpo bajó de estrés alto</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: rr.downshift_count && rr.downshift_count >= 3 ? C.green : C.amber }}>
                    {rr.downshift_count ?? 0}
                  </div>
                </div>
              )}
            </Card>

            {/* ── 6. RECOMENDACIÓN ── */}
            {rec && (
              <Card style={{ marginBottom: 12, borderLeft: `3px solid ${rec.color}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: rec.color, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.secondary, marginBottom: 4 }}>Recomendación del día</div>
                    <p style={{ fontSize: 14, color: C.text, margin: 0, lineHeight: 1.5 }}>{rec.text}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* ── 7. IA ── */}
            {aiLoading && !ai && <AiLoadingCard />}
            {ai?.today?.action && (
              <Card style={{ marginBottom: 12, background: C.purpleLight, border: `1px solid ${C.purple}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <ApexBadge />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Apex IA</span>
                </div>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: "0 0 6px" }}>{ai.today.action}</p>
                {ai.today.performance && (
                  <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5, margin: 0 }}>{ai.today.performance}</p>
                )}
              </Card>
            )}

            {/* ── 8. HISTORIAL ── */}
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
              <button onClick={() => setChatOpen(true)} style={{
                width: "100%", padding: 14, background: C.purple, color: "#fff",
                border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}>
                💬 Hablar con IA
              </button>
              <button onClick={handleDeepAnalysis} disabled={generatingDeep} style={{
                width: "100%", padding: 12, background: C.purpleLight, color: C.purple,
                border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
                cursor: generatingDeep ? "default" : "pointer", opacity: generatingDeep ? 0.7 : 1,
              }}>
                {generatingDeep ? "Analizando..." : "Análisis profundo →"}
              </button>
              <button onClick={() => setDataExpanded(!dataExpanded)} style={{
                width: "100%", padding: 12, background: "transparent", color: C.secondary,
                border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}>
                {dataExpanded ? "▲ Ocultar datos" : "▼ Ver toda la data"}
              </button>
            </div>

            {/* ── 10. RAW DATA ── */}
            {dataExpanded && (
              <Card style={{ marginBottom: 24 }}>
                <DataSection label="Garmin — Body Battery">
                  <DataRow l="Al despertar" v={`${ed?.body_battery_start ?? "—"}`} />
                  <DataRow l="Mínimo del día" v={`${ed?.body_battery_min ?? "—"}`} />
                  <DataRow l="Máximo del día" v={`${ed?.body_battery_max ?? "—"}`} />
                  <DataRow l="Al final del día" v={`${ed?.body_battery_end ?? "—"}`} />
                  <DataRow l="Cambio neto" v={ed?.body_battery_change != null ? `${ed.body_battery_change >= 0 ? "+" : ""}${Math.round(ed.body_battery_change)} pts` : "—"} />
                </DataSection>

                <DataSection label="Garmin — Estrés y FC">
                  <DataRow l="Estrés promedio" v={nsl?.avg_stress != null ? `${Math.round(nsl.avg_stress)}` : "—"} />
                  <DataRow l="Estrés máximo" v={nsl?.max_stress != null ? `${Math.round(nsl.max_stress)}` : "—"} />
                  <DataRow l="FC promedio" v={nsl?.avg_hr != null ? `${Math.round(nsl.avg_hr)} bpm` : "—"} />
                  <DataRow l="FC en reposo" v={nsl?.resting_hr != null ? `${Math.round(nsl.resting_hr)} bpm` : "—"} />
                  <DataRow l="HRV diurno" v={nsl?.avg_hrv != null ? `${Math.round(nsl.avg_hrv)} ms` : "—"} />
                  <DataRow l="Picos de estrés" v={nsl?.stress_spike_count != null ? `${nsl.stress_spike_count}` : "—"} />
                  <DataRow l="Ratio estrés alto" v={nsl?.high_stress_ratio != null ? `${(nsl.high_stress_ratio * 100).toFixed(1)}%` : "—"} />
                </DataSection>

                <DataSection label="Garmin — Actividad física">
                  <DataRow l="Pasos" v={pl?.steps != null ? pl.steps.toLocaleString() : "—"} />
                  <DataRow l="Minutos intensidad" v={pl?.intensity_minutes != null ? `${Math.round(pl.intensity_minutes)} min` : "—"} />
                  <DataRow l="Calorías activas" v={pl?.active_calories != null ? `${Math.round(pl.active_calories)} kcal` : "—"} />
                  <DataRow l="Respiración prom." v={a.respiratory?.avg_respiration != null ? `${a.respiratory.avg_respiration.toFixed(1)} rpm` : "—"} />
                </DataSection>

                <DataSection label="Apex — Carga de entrenamiento">
                  <DataRow l="CTL (forma crónica)" v={tl?.ctl != null ? `${tl.ctl.toFixed(1)}` : "—"} highlight />
                  <DataRow l="ATL (fatiga aguda)" v={tl?.atl != null ? `${tl.atl.toFixed(1)}` : "—"} highlight />
                  <DataRow l="TSB (balance)" v={tl?.tsb != null ? `${tl.tsb.toFixed(1)}` : "—"} highlight />
                  <DataRow l="Estado de forma" v={tsbLabel} />
                </DataSection>

                <DataSection label="Apex — Sistema nervioso y recuperación">
                  <DataRow l="Carga SNA (0-100)" v={nsl?.nervous_system_load_score != null ? `${Math.round(nsl.nervous_system_load_score)}/100` : "—"} highlight />
                  <DataRow l="Score energía" v={ed?.energy_dynamics_score != null ? `${Math.round(ed.energy_dynamics_score)}/100` : "—"} />
                  <DataRow l="Score recuperación" v={rr?.recovery_response_score != null ? `${Math.round(rr.recovery_response_score)}/100` : "—"} />
                  <DataRow l="Downshifts (recuperaciones)" v={rr?.downshift_count != null ? `${rr.downshift_count}` : "—"} highlight />
                  <DataRow l="Ratio downshift" v={rr?.downshift_ratio != null ? `${(rr.downshift_ratio * 100).toFixed(1)}%` : "—"} />
                  <DataRow l="Score respiración" v={a.respiratory?.respiratory_score != null ? `${Math.round(a.respiratory.respiratory_score)}/100` : "—"} />
                  <DataRow l="Carga mental" v={a.cognitive_load?.cognitive_load_score != null ? `${Math.round(a.cognitive_load.cognitive_load_score)}/100` : "—"} />
                  <DataRow l="Tensión del sistema" v={a.recovery_summary?.system_strain_score != null ? `${Math.round(a.recovery_summary.system_strain_score)}/100` : "—"} />
                  <DataRow l="Capacidad del día" v={a.recovery_summary?.day_capacity_score != null ? `${Math.round(a.recovery_summary.day_capacity_score)}/100` : "—"} />
                  <DataRow l="Score día (global)" v={a.recovery_summary?.overall_day_state_score != null ? `${Math.round(a.recovery_summary.overall_day_state_score)}/100` : "—"} />
                  {a.recovery_summary?.primary_limiter && <DataRow l="Limitante principal" v={a.recovery_summary.primary_limiter.replace(/_/g, " ")} />}
                  {a.recovery_summary?.secondary_limiter && <DataRow l="Limitante secundario" v={a.recovery_summary.secondary_limiter.replace(/_/g, " ")} />}
                </DataSection>
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
          subtitle={`${selectedDate}`}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
