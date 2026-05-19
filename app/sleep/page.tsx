"use client";

import { useState, useEffect } from "react";
import { DatePills } from "../components/DatePills";
import { DeepAnalysisModal } from "../components/DeepAnalysisModal";
import { ApexChat } from "../components/ApexChat";
import { ScoreRing } from "../components/ScoreRing";
import {
  C, triColor,
} from "@/app/lib/apex-tokens";
import {
  ApexStyles, Card, ApexBadge, MetricCard, SectionHead,
  AiLoadingCard, ShimmerSkeleton, PageNav, CorrelationsCard, Chip,
} from "@/app/components/ApexUI";

// ── Types ──────────────────────────────────────────────────────────────────
interface SleepAnalysis {
  overall_recovery_score: number;
  physical_recovery_score: number;
  neural_recovery_score: number;
  sleep_time_seconds: number;
  time_in_bed_seconds: number;
  sleep_efficiency: number;
  sleep_start_local: string | null;
  sleep_end_local: string | null;
  deep_ratio: number;
  rem_ratio: number;
  light_ratio: number | null;
  awake_ratio: number | null;
  awake_count: number | null;
  fragmentation_index: number | null;
  movement_index: number | null;
  restlessness_score: number | null;
  architecture_balance_score: number | null;
  architecture_stability_score: number | null;
  stage_transition_count: number | null;
  early_window_deep_ratio: number | null;
  late_window_rem_ratio: number | null;
  deep_distribution_score: number | null;
  rem_distribution_score: number | null;
  avg_sleep_hr: number | null;
  resting_hr: number | null;
  min_sleep_hr: number | null;
  max_sleep_hr: number | null;
  hr_drop: number | null;
  hr_stability_index: number | null;
  hr_recovery_slope: number | null;
  hr_first_third_avg: number | null;
  hr_last_third_avg: number | null;
  hr_overnight_drop_pct: number | null;
  avg_overnight_hrv: number;
  hrv_status: string;
  hrv_recovery_score: number;
  hrv_ramp_score: number | null;
  autonomic_recovery_curve_score: number | null;
  sympathetic_activation_score: number | null;
  hrv_first_half: number | null;
  hrv_second_half: number | null;
  stress_first_third_avg: number | null;
  stress_last_third_avg: number | null;
  avg_sleep_stress: number;
  stress_load_score: number;
  stress_stability_index: number | null;
  stress_spike_count: number | null;
  avg_respiration: number | null;
  min_respiration: number | null;
  max_respiration: number | null;
  respiration_variability: number | null;
  respiratory_stability_score: number | null;
  breathing_disruption_severity: string | null;
  respiratory_irregularity_score: number | null;
  avg_spo2: number;
  min_spo2: number;
  max_spo2: number | null;
  oxygen_risk_flag: boolean;
  oxygen_stability_score: number | null;
  spo2_drop_count: number | null;
  spo2_drop_depth_avg: number | null;
  oxygen_recovery_after_drop_score: number | null;
  body_battery_start: number | null;
  body_battery_end: number;
  body_battery_change: number;
  recharge_efficiency: number;
  bb_gain_first_half: number | null;
  bb_gain_second_half: number | null;
  body_battery_recharge_velocity: number | null;
  sleep_need_baseline_minutes: number | null;
  sleep_need_actual_minutes: number | null;
  sleep_need_gap_minutes: number | null;
  sleep_need_feedback: string | null;
  sleep_need_training_feedback: string | null;
  circadian_alignment_score: number;
  sleep_alignment_status: string | null;
  sleep_midpoint_minutes: number | null;
  optimal_midpoint_minutes: number | null;
  overnight_instability_score: number | null;
  micro_arousal_score: number | null;
  movement_spike_count: number | null;
}

interface AiSystem { name: string; score: number; status: string; message: string; }
interface AiCorrelation { systems: string[]; root_cause: string; insight: string; severity: "high" | "medium"; }

interface BriefAI {
  hero?: { score: number; status: string; headline: string };
  systems?: AiSystem[];
  today?: { performance: string; action: string };
  pattern?: { message: string };
  correlations?: AiCorrelation[];
  deep_analysis?: Record<string, unknown>;
}

interface SleepBrief {
  headline: string;
  recovery_status: string;
  primary_limiter: string | null;
  secondary_limiter: string | null;
  overall_summary: string;
  training_recommendation?: string;
  recovery_recommendation?: string;
  positive_markers?: string[];
  risk_markers?: string[];
  coach_note?: string;
  key_evidence?: Array<{ label: string; value: string; meaning: string }>;
}

interface SleepHistoryRow {
  calendar_date: string;
  overall_recovery_score: number;
  avg_overnight_hrv?: number;
  recharge_efficiency?: number;
  deep_ratio?: number;
  sleep_time_seconds?: number;
}

interface SleepPageData {
  date: string;
  analysis: SleepAnalysis | null;
  baselines: Record<string, unknown> | null;
  brief: SleepBrief | null;
  brief_ai: BriefAI | null;
  deep_ai: Record<string, unknown> | null;
}

// ── Formatters ─────────────────────────────────────────────────────────────
function fmt(v: number | null | undefined, d = 1) { return v == null ? "—" : v.toFixed(d); }
function fmtInt(v: number | null | undefined) { return v == null ? "—" : Math.round(v).toString(); }
function formatHours(secs: number | null | undefined) {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return `${h}h ${m}m`;
}
function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const t = iso.slice(11, 16);
  if (t.length < 5) return "—";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10), m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "—";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtMin(minutes: number | null | undefined) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function sysColor(score: number) {
  if (score >= 7) return C.green;
  if (score >= 5) return C.amber;
  return C.red;
}

// ── Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data, color = C.purple }: { data: (number | null)[]; color?: string }) {
  const vals = data.filter((v): v is number => v != null);
  if (vals.length < 2) return <div style={{ height: 40 }} />;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const w = 100, h = 40, padX = 0, padY = 3;
  const pts = data.map((v, i) => {
    if (v == null) return null;
    const x = padX + (i / (data.length - 1)) * (w - padX * 2);
    const y = padY + ((max - v) / range) * (h - padY * 2);
    return `${x},${y}`;
  }).filter(Boolean).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block", width: "100%" }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
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

function RawData({ a, brief }: { a: SleepAnalysis; brief: SleepBrief | null }) {
  return (
    <div>
      <DataSection label="Recuperación">
        <DataRow l="Score total" v={`${a.overall_recovery_score.toFixed(1)}/100`} />
        <DataRow l="Recuperación física" v={`${a.physical_recovery_score.toFixed(1)}/100`} />
        <DataRow l="Recuperación neural" v={`${a.neural_recovery_score.toFixed(1)}/100`} />
      </DataSection>
      <DataSection label="Ventana de sueño">
        <DataRow l="Inicio" v={fmtTime(a.sleep_start_local)} />
        <DataRow l="Fin" v={fmtTime(a.sleep_end_local)} />
        <DataRow l="Duración" v={formatHours(a.sleep_time_seconds)} />
        <DataRow l="Tiempo en cama" v={formatHours(a.time_in_bed_seconds)} />
        <DataRow l="Eficiencia" v={`${(a.sleep_efficiency * 100).toFixed(0)}%`} />
      </DataSection>
      <DataSection label="Arquitectura">
        <DataRow l="Sueño profundo" v={`${(a.deep_ratio * 100).toFixed(1)}%`} />
        <DataRow l="Sueño ligero" v={`${((a.light_ratio ?? 0) * 100).toFixed(1)}%`} />
        <DataRow l="REM" v={`${(a.rem_ratio * 100).toFixed(1)}%`} />
        <DataRow l="Despierto" v={`${((a.awake_ratio ?? 0) * 100).toFixed(1)}%`} />
        <DataRow l="Fragmentación" v={a.fragmentation_index != null ? a.fragmentation_index.toFixed(2) : "—"} />
        <DataRow l="Transiciones de etapa" v={fmtInt(a.stage_transition_count)} />
        <DataRow l="Inquietud (Apex)" v={a.restlessness_score != null ? `${fmtInt(a.restlessness_score)}/100` : "—"} />
      </DataSection>
      <DataSection label="HRV y autonómico">
        <DataRow l="HRV promedio nocturno" v={`${fmtInt(a.avg_overnight_hrv)} ms`} />
        <DataRow l="Estado HRV" v={a.hrv_status} />
        <DataRow l="Score HRV" v={`${a.hrv_recovery_score.toFixed(0)}/100`} />
        <DataRow l="HRV primera mitad" v={a.hrv_first_half != null ? `${fmt(a.hrv_first_half)} ms` : "—"} />
        <DataRow l="HRV segunda mitad" v={a.hrv_second_half != null ? `${fmt(a.hrv_second_half)} ms` : "—"} />
        <DataRow l="Curva autonómica (Apex)" v={a.autonomic_recovery_curve_score != null ? `${fmtInt(a.autonomic_recovery_curve_score)}/100` : "—"} />
      </DataSection>
      <DataSection label="Cardíaco">
        <DataRow l="FC promedio nocturna" v={a.avg_sleep_hr != null ? `${fmtInt(a.avg_sleep_hr)} bpm` : "—"} />
        <DataRow l="FC en reposo" v={a.resting_hr != null ? `${fmtInt(a.resting_hr)} bpm` : "—"} />
        <DataRow l="FC mínima" v={a.min_sleep_hr != null ? `${fmtInt(a.min_sleep_hr)} bpm` : "—"} />
        <DataRow l="FC máxima" v={a.max_sleep_hr != null ? `${fmtInt(a.max_sleep_hr)} bpm` : "—"} />
        <DataRow l="Caída FC nocturna" v={a.hr_drop != null ? `${fmt(a.hr_drop)} bpm` : "—"} />
        <DataRow l="Estabilidad FC (Apex)" v={a.hr_stability_index != null ? `${fmtInt(a.hr_stability_index)}/100` : "—"} />
      </DataSection>
      <DataSection label="Estrés nocturno">
        <DataRow l="Estrés promedio" v={`${fmtInt(a.avg_sleep_stress)}`} />
        <DataRow l="Score carga de estrés" v={`${fmtInt(a.stress_load_score)}/100`} />
        <DataRow l="Picos de estrés" v={fmtInt(a.stress_spike_count)} />
        <DataRow l="Estabilidad estrés (Apex)" v={a.stress_stability_index != null ? `${fmtInt(a.stress_stability_index)}/100` : "—"} />
      </DataSection>
      <DataSection label="Respiración">
        <DataRow l="Resp. promedio" v={a.avg_respiration != null ? `${fmt(a.avg_respiration)} rpm` : "—"} />
        <DataRow l="Estabilidad resp. (Apex)" v={a.respiratory_stability_score != null ? `${fmtInt(a.respiratory_stability_score)}/100` : "—"} />
        <DataRow l="Severidad disrupción" v={a.breathing_disruption_severity ?? "—"} />
      </DataSection>
      <DataSection label="Oxigenación">
        <DataRow l="SpO₂ promedio" v={`${fmtInt(a.avg_spo2)}%`} />
        <DataRow l="SpO₂ mínima" v={`${fmtInt(a.min_spo2)}%`} />
        <DataRow l="SpO₂ máxima" v={a.max_spo2 != null ? `${fmtInt(a.max_spo2)}%` : "—"} />
        <DataRow l="Alerta oxígeno" v={a.oxygen_risk_flag ? "Sí ⚠" : "No"} />
        <DataRow l="Score oxigenación (Apex)" v={a.oxygen_stability_score != null ? `${fmtInt(a.oxygen_stability_score)}/100` : "—"} />
      </DataSection>
      <DataSection label="Body Battery">
        <DataRow l="Al dormir" v={`${a.body_battery_start ?? "—"}`} />
        <DataRow l="Al despertar" v={`${a.body_battery_end}`} />
        <DataRow l="Ganancia" v={`+${fmtInt(a.body_battery_change)}`} />
        <DataRow l="Eficiencia recarga" v={`${fmt(a.recharge_efficiency)}%`} />
      </DataSection>
      <DataSection label="Circadiano y necesidad">
        <DataRow l="Alineación circadiana" v={`${fmtInt(a.circadian_alignment_score)}/100`} />
        <DataRow l="Estado circadiano" v={a.sleep_alignment_status ?? "—"} />
        <DataRow l="Punto medio del sueño" v={fmtMin(a.sleep_midpoint_minutes)} />
        <DataRow l="Déficit" v={a.sleep_need_gap_minutes != null ? `${fmtInt(a.sleep_need_gap_minutes)} min` : "—"} />
      </DataSection>
      {brief && (
        <DataSection label="Diagnóstico motor">
          <DataRow l="Headline" v={brief.headline} />
          <DataRow l="Limitador principal" v={brief.primary_limiter ?? "—"} />
          {brief.coach_note && <DataRow l="Nota coach" v={brief.coach_note} />}
        </DataSection>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SleepPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData]                 = useState<SleepPageData | null>(null);
  const [history, setHistory]           = useState<SleepHistoryRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [aiLoading, setAiLoading]       = useState(false);
  const [deepResult, setDeepResult]     = useState<Record<string, unknown> | null>(null);
  const [deepOpen, setDeepOpen]         = useState(false);
  const [dataExpanded, setDataExpanded] = useState(false);
  const [generatingDeep, setGeneratingDeep] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetch("/api/history?section=sleep&days=60")
      .then(r => r.json())
      .then((rows: SleepHistoryRow[]) => {
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
    fetch(`/api/sleep?date=${selectedDate}`)
      .then(r => r.json())
      .then((d: SleepPageData) => {
        setData(d);
        if (d.deep_ai) setDeepResult(d.deep_ai);
        setLoading(false);
        if (!d.brief_ai && d.analysis) {
          setAiLoading(true);
          fetch(`/api/ai/sleep-brief?date=${selectedDate}`)
            .then(r => r.json())
            .then(b => {
              if (b.ok && b.brief) setData(prev => prev ? { ...prev, brief_ai: b.brief as BriefAI } : prev);
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
        body: JSON.stringify({ section: "sleep", date: selectedDate, type: "deep" }),
      });
      const d = await res.json();
      const content = d.content ?? d;
      if (content && typeof content === "object") { setDeepResult(content); setDeepOpen(true); }
    } catch { /* ignore */ }
    finally { setGeneratingDeep(false); }
  }

  const a     = data?.analysis ?? null;
  const ai    = data?.brief_ai ?? null;
  const brief = data?.brief ?? null;
  const score = a?.overall_recovery_score ?? null;
  const hasData = a && a.sleep_time_seconds > 0;
  const showSpO2Alert = a?.oxygen_risk_flag || (a?.min_spo2 != null && a.min_spo2 < 88);
  const showCircAlert = a?.sleep_alignment_status === "BEHIND";
  const dates = history.map(r => r.calendar_date);
  const last30 = history.slice(-30);
  const trendRecovery = last30.map(r => r.overall_recovery_score > 0 ? r.overall_recovery_score : null);
  const trendHRV      = last30.map(r => r.avg_overnight_hrv != null && r.avg_overnight_hrv > 0 ? r.avg_overnight_hrv : null);
  const trendDeep     = last30.map(r => r.deep_ratio != null && r.deep_ratio > 0 ? r.deep_ratio * 100 : null);
  const trendBB       = last30.map(r => r.recharge_efficiency != null && r.recharge_efficiency > 0 ? r.recharge_efficiency : null);
  const veredicto = ai?.hero?.status
    ?? (score !== null ? (score >= 70 ? "Buena recuperación" : score >= 50 ? "Recuperación moderada" : "Recuperación baja") : "—");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 80 }}>
      <ApexStyles />

      <PageNav title="Sueño" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>

        {dates.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <DatePills dates={dates} selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
        )}

        {loading && <ShimmerSkeleton heights={[120, 80, 180, 140, 100]} />}

        {!loading && !hasData && (
          <Card>
            <p style={{ color: C.muted, textAlign: "center", fontSize: 14, margin: 0 }}>
              Sin datos de sueño para esta noche.
            </p>
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {showSpO2Alert && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.redBg, color: C.red, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>
                        ⚠ SpO₂ bajó a {fmtInt(a.min_spo2)}%
                      </span>
                    )}
                    {showCircAlert && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.amberBg, color: C.amber, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>
                        ⏰ Ritmo retrasado
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {fmtTime(a.sleep_start_local)} → {fmtTime(a.sleep_end_local)} · {formatHours(a.sleep_time_seconds)}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── 2. MÉTRICAS ── */}
            {(() => {
              const hrvSt = triColor(a.avg_overnight_hrv, 55, 45);
              const eff   = a.sleep_efficiency * 100;
              const hours = a.sleep_time_seconds / 3600;
              const slpSt = (eff >= 85 && hours >= 6.5) ? { color: C.green, bg: C.greenBg } : eff >= 75 ? { color: C.amber, bg: C.amberBg } : { color: C.red, bg: C.redBg };
              const bbSt  = triColor(a.body_battery_change, 40, 20);
              const spo2St = triColor(a.min_spo2, 92, 88);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <MetricCard color={hrvSt.color} bg={hrvSt.bg} label="HRV"
                    value={`${fmtInt(a.avg_overnight_hrv)} ms`}
                    sub={a.hrv_status === "BALANCED" ? "equilibrado" : (a.hrv_status ?? "").toLowerCase()} />
                  <MetricCard color={slpSt.color} bg={slpSt.bg} label="SUEÑO"
                    value={formatHours(a.sleep_time_seconds)}
                    sub={`${eff.toFixed(0)}% eficiencia`} />
                  <MetricCard color={bbSt.color} bg={bbSt.bg} label="BODY BATTERY"
                    value={`+${fmtInt(a.body_battery_change)}`}
                    sub={`${a.body_battery_start ?? "—"} → ${a.body_battery_end}`} />
                  <MetricCard color={spo2St.color} bg={spo2St.bg} label="SpO₂ MÍN."
                    value={`${fmtInt(a.min_spo2)}%`}
                    sub={`prom. ${fmtInt(a.avg_spo2)}%${a.oxygen_risk_flag ? " · ⚠ alerta" : ""}`} />
                </div>
              );
            })()}

            {/* ── 3. AI LOADING / RECOMENDACIÓN ── */}
            {aiLoading && !ai && <AiLoadingCard />}

            {/* Brief fallback while brief_ai not yet loaded */}
            {!aiLoading && !ai && brief?.overall_summary && (
              <Card style={{ marginBottom: 12, background: C.purpleLight, border: `1px solid ${C.purple}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ApexBadge />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Resumen</span>
                </div>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0 }}>
                  {brief.overall_summary}
                </p>
                {brief.training_recommendation && (
                  <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5, margin: "8px 0 0" }}>
                    {brief.training_recommendation}
                  </p>
                )}
              </Card>
            )}

            {ai?.today?.action && (
              <Card style={{ marginBottom: 12, background: C.purpleLight, border: `1px solid ${C.purple}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ApexBadge />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Recomendación de hoy</span>
                </div>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: "0 0 12px" }}>
                  {ai.today.action}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {a.oxygen_risk_flag && <Chip label="Control respiratorio" />}
                  {showCircAlert && <Chip label="Acostarse antes" />}
                  {score !== null && score >= 65 && !showCircAlert && <Chip label="Z1–Z2 ok" />}
                  {score !== null && score < 65  && <Chip label="Carga reducida" />}
                </div>
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
                        {sys.status === "down" && (
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

            {/* ── 6. ARQUITECTURA DEL SUEÑO ── */}
            <Card style={{ marginBottom: 12 }}>
              <SectionHead>Arquitectura del sueño</SectionHead>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 18, marginBottom: 14 }}>
                <div style={{ flex: a.deep_ratio,          background: "#1A5C9E" }} />
                <div style={{ flex: a.light_ratio ?? 0,    background: "#7AB4E8" }} />
                <div style={{ flex: a.rem_ratio,           background: C.purple  }} />
                <div style={{ flex: Math.max(a.awake_ratio ?? 0, 0.005), background: C.border }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                {([
                  { color: "#1A5C9E", label: "Profundo", pct: a.deep_ratio },
                  { color: "#7AB4E8", label: "Ligero",   pct: a.light_ratio ?? 0 },
                  { color: C.purple,  label: "REM",      pct: a.rem_ratio },
                  { color: C.muted,   label: "Despierto", pct: a.awake_ratio ?? 0 },
                ] as const).map(({ color, label, pct }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.secondary }}>
                      {label} <strong style={{ color: C.text }}>{(pct * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── 7. PATRÓN PERSONAL ── */}
            {ai?.pattern?.message && (
              <Card style={{ marginBottom: 12, background: C.purpleLight, border: `1px solid ${C.purple}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ApexBadge />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Patrón personal</span>
                </div>
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>
                  {ai.pattern.message}
                </p>
              </Card>
            )}

            {/* ── 8. TENDENCIAS 30 DÍAS ── */}
            {last30.length >= 4 && (
              <Card style={{ marginBottom: 12 }}>
                <SectionHead>Tendencias 30 días</SectionHead>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { label: "Recuperación",  data: trendRecovery, unit: "/100", deltaUnit: "pts", color: C.green,    upGood: true },
                    { label: "HRV nocturno",  data: trendHRV,      unit: " ms",  deltaUnit: "ms",  color: C.purple,   upGood: true },
                    { label: "Sueño profundo",data: trendDeep,     unit: "%",    deltaUnit: "%",   color: "#1A5C9E",  upGood: true },
                    { label: "Recarga BB",    data: trendBB,       unit: "%",    deltaUnit: "%",   color: C.amber,    upGood: true },
                  ] as const).map(({ label, data, unit, deltaUnit, color, upGood }) => {
                    const vals   = data.filter((v): v is number => v != null);
                    const last   = vals.at(-1);
                    const prevAvg = vals.length >= 6
                      ? vals.slice(-6, -1).reduce((s, v) => s + v, 0) / 5
                      : vals.length >= 2 ? vals.slice(0, -1).reduce((s, v) => s + v, 0) / (vals.length - 1) : null;
                    const delta  = last != null && prevAvg != null ? last - prevAvg : null;
                    const isUp   = delta != null && delta > 0.5;
                    const isDown = delta != null && delta < -0.5;
                    const isGood = isUp ? upGood : isDown ? !upGood : null;
                    const trendColor = isGood == null ? C.muted : isGood ? C.green : C.red;
                    const arrow = isUp ? "↑" : isDown ? "↓" : null;
                    return (
                      <div key={label} style={{ background: C.bg, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "10px 12px 8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
                            {arrow && delta != null && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>
                                {arrow} {Math.abs(Math.round(delta))} {deltaUnit}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                            {last != null ? `${Math.round(last)}${unit}` : "—"}
                          </div>
                        </div>
                        <div style={{ flex: 1, padding: "0 0 0 0" }}>
                          <Sparkline data={data} color={color} />
                        </div>
                      </div>
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
                {generatingDeep ? "Analizando..." : deepResult ? "Análisis profundo →" : "Análisis profundo →"}
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
                <RawData a={a} brief={brief} />
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
          section="sleep"
          context={{ date: selectedDate, analysis: data.analysis, brief_ai: data.brief_ai, brief: data.brief }}
          subtitle={`${selectedDate} · Score ${Math.round(score ?? 0)}`}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
