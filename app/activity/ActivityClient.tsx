"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ApexChat } from "@/app/components/ApexChat";
import { C, semaforo, semaforoBg } from "@/app/lib/apex-tokens";
import {
  ApexStyles, Card, ApexBadge, MotorBadge, SectionHead,
  AiLoadingCard, ShimmerSkeleton, DeltaPill,
} from "@/app/components/ApexUI";

// ── Types ──────────────────────────────────────────────────────────────────
interface Climb {
  start_min: number; end_min: number; duration_min: number;
  distance_m: number; elevation_gain_m: number; avg_grade_pct: number;
  avg_power: number | null; max_power: number | null;
  avg_hr: number | null; max_hr: number | null;
  avg_cadence: number | null; vam: number; climb_type: string; climb_score: number;
}
interface Zone { seconds: number; minutes: number; pct: number; }
interface PScore { score: number | null; reason?: string; }
interface Analysis {
  garmin_summary: {
    name: string; type: string; start_date: string;
    distance_km: number; moving_minutes: number; elapsed_minutes: number;
    elevation_m: number; calories: number;
    avg_hr: number | null; max_hr: number | null;
    avg_power: number | null; max_power: number | null;
    garmin_np: number | null; garmin_tss: number | null; garmin_if: number | null;
    vo2max: number | null; aerobic_te: number | null; anaerobic_te: number | null;
    grit: number | null;
  };
  derived_summary: {
    avg_speed_kmh: number; avg_cadence_rpm: number | null;
    active_cadence_rpm: number | null; pedaling_pct: number | null;
    estimated_np: number; vi: number | null; estimated_if: number;
    estimated_tss: number | null; energy_kj: number;
    aerobic_efficiency: number | null; ride_classification: string;
  };
  power_profile: Record<string, { avg_power: number; avg_hr?: number } | null>;
  zones: { power: Record<string, Zone>; heart_rate: Record<string, Zone> };
  climbs: Climb[];
  fatigue: {
    fatigue_onset_min: number | null; power_drop_pct: number | null;
    efficiency_drop_pct: number | null; climb_repeatability_pct: number | null;
  };
  athlete_profile: { primary_type: string; strengths: string[]; limiters: string[] };
  metabolic_index: { avg_msi: number | null; high_msi_pct: number | null };
  performance_scores: {
    repeatability_score: PScore; metabolic_cost_score: PScore;
    efficiency_score: PScore; pacing_score: PScore;
    muscular_load_score: PScore; overall_score: PScore;
  };
}
interface Highlight {
  titulo: string; valor: string; contexto: string; delta: string | null;
  sentimiento: "positivo" | "neutro" | "negativo"; detalle: string;
}
interface AiCorrelation { systems: string[]; root_cause: string; insight: string; severity: "high" | "medium"; }
interface Brief {
  quick_brief: {
    headline: string; score: number; score_label: string;
    highlights: Highlight[];
    veredicto: string; recomendacion_tecnica: string; recomendacion_entrenamiento: string;
  };
  three_day_plan: {
    contexto: string;
    dias: { dia: string; tipo: string; descripcion: string; duracion: string; intensidad: string; metricas_objetivo: string; si_te_sientes_mal: string }[];
  };
  phase_2_deep_analysis: { medical_interpretation: string; findings_summary: string[] };
  correlations?: AiCorrelation[];
}
interface SeriesInsights {
  cardiac_decoupling?: { decoupled: boolean; severity: string; decoupling_ratio: number; interpretation: string };
  stamina_depletion?: { stamina_start_pct: number; stamina_end_pct: number; total_drop_pct: number; fastest_drop_magnitude_pct: number; fastest_drop_start_min: number; interpretation: string };
  cadence_fatigue_per_climb?: { climb_index: number; cadence_drop_pct: number; severity: string }[];
  second_half_degradation?: { degradation_score: number; power_delta_pct: number; hr_delta_pct: number; stamina_delta_pct: number; interpretation: string };
  best_vs_worst_climb?: { best_vam: number; worst_vam: number; vam_gap_pct: number; best_avg_power: number; worst_avg_power: number; power_gap_pct: number; interpretation: string };
  wbpm_efficiency_segments?: { first_half_avg: number; second_half_avg: number; deterioration_pct: number; interpretation: string };
  peak_power_context?: { power_peak_w: number; elapsed_min_at_peak: number; hr_at_peak: number; interpretation: string };
}
interface FTPProfile {
  ftp_current: number | null;
  power_curve_best: Record<string, { power: number; date: string } | null>;
}
interface ActivityItem {
  activity_id: number; name: string; date: string; type: string;
  distance_km: number; moving_minutes: number; elevation_m: number;
  avg_power: number | null; garmin_tss: number | null;
  primary_limiter: string;
  analysis_file?: string; brief_file?: string | null;
}
interface Bundle {
  activity: ActivityItem; brief: Brief | null; analysis: Analysis | null;
  series_insights: SeriesInsights | null; ftp_profile: FTPProfile | null;
  athlete_baseline: Record<string, unknown> | null;
}

// ── Type filter ────────────────────────────────────────────────────────────
type TypeFilter = "all" | "mtb" | "road" | "running" | "other";

function getTypeGroup(type: string | undefined): Exclude<TypeFilter, "all"> {
  const t = (type ?? "").toLowerCase();
  if (t.includes("mountain_bik") || t === "mtb") return "mtb";
  if (t.includes("road_bik") || t.includes("cycling") || t.includes("virtual")) return "road";
  if (t.includes("run") || t.includes("walk") || t.includes("hik") || t.includes("trail")) return "running";
  return "other";
}

const TYPE_OPTIONS: { key: TypeFilter; label: string; icon: string }[] = [
  { key: "all",     label: "Todas",   icon: "◎" },
  { key: "mtb",     label: "MTB",     icon: "⛰" },
  { key: "road",    label: "Ruta",    icon: "🚴" },
  { key: "running", label: "Running", icon: "🏃" },
  { key: "other",   label: "Otro",    icon: "●" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  try {
    const dt = new Date(d);
    const days = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]}`;
  } catch { return d.slice(0, 10); }
}
function fmtMin(m: number) {
  const h = Math.floor(m / 60); const mm = Math.round(m % 60);
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

// ── Charts ─────────────────────────────────────────────────────────────────
function ElevationProfile({ climbs, totalMin }: { climbs: Climb[]; totalMin: number }) {
  const W = 320, H = 40;
  if (!climbs.length) return null;
  const pts: [number, number][] = [[0, H * 0.8]];
  for (const c of climbs) {
    const x1 = (c.start_min / totalMin) * W;
    const x2 = ((c.start_min + c.duration_min) / totalMin) * W;
    const elevation = Math.min(c.elevation_gain_m / 150, 1);
    pts.push([x1, H * 0.8], [x2, H * 0.8 - elevation * H * 0.6], [x2 + (x2 - x1) * 0.3, H * 0.8]);
  }
  pts.push([W, H * 0.8]);
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const areaD = `${pathD} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <defs>
        <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.purple} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.purple} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#elev-fill)" />
      <path d={pathD} fill="none" stroke={C.purple} strokeWidth="1.5" />
      {climbs.map((c, i) => {
        const x = ((c.start_min + c.duration_min / 2) / totalMin) * W;
        return (
          <g key={i}>
            <line x1={x} y1={0} x2={x} y2={H} stroke={C.purple} strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
            <text x={x} y={10} textAnchor="middle" fontSize="7" fill={C.purpleText} fontWeight="700">S{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PowerHRChart({ analysis, seriesInsights }: { analysis: Analysis; seriesInsights: SeriesInsights | null }) {
  const W = 320, H = 80;
  const fatigue = analysis.fatigue;
  const fatigueMin = fatigue.fatigue_onset_min;
  const deg = seriesInsights?.second_half_degradation;
  const points = 20;

  const powerPts: [number, number][] = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const drop = deg ? (t > 0.5 ? (t - 0.5) * 2 * (deg.power_delta_pct / 100) : 0) : 0;
    const noise = Math.sin(i * 2.3) * 0.08;
    const y = H * 0.2 + H * 0.5 * (1 - (0.6 - drop + noise));
    return [t * W, Math.max(H * 0.15, Math.min(H * 0.85, y))];
  });

  const hrPts: [number, number][] = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const drift = deg ? t * (deg.hr_delta_pct / 100) * 0.4 : t * 0.1;
    const noise = Math.cos(i * 1.7) * 0.05;
    const y = H * 0.3 + H * 0.4 * (1 - (0.5 + drift + noise));
    return [t * W, Math.max(H * 0.15, Math.min(H * 0.9, y))];
  });

  const toPath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const toArea = (pts: [number, number][], bot: number) => `${toPath(pts)} L ${W} ${bot} L 0 ${bot} Z`;
  const fatigueX = fatigueMin != null ? (fatigueMin / analysis.garmin_summary.elapsed_minutes) * W : null;

  return (
    <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        <defs>
          <linearGradient id="pw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.purple} stopOpacity="0.2" />
            <stop offset="100%" stopColor={C.purple} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="hr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={toArea(hrPts, H)} fill="url(#hr-fill)" />
        <path d={toPath(hrPts)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
        <path d={toArea(powerPts, H)} fill="url(#pw-fill)" />
        <path d={toPath(powerPts)} fill="none" stroke={C.purple} strokeWidth="1.5" />
        {fatigueX != null && (
          <g>
            <line x1={fatigueX} y1={0} x2={fatigueX} y2={H} stroke="#f97316" strokeWidth="1.5" strokeDasharray="3,2" />
            <text x={fatigueX + 3} y={12} fontSize="7" fill="#f97316" fontWeight="700">inicio fatiga min {Math.round(fatigueMin!)}</text>
          </g>
        )}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 8, paddingLeft: 2 }}>
        {[
          { color: C.purple, label: "Potencia" },
          { color: "#ef4444", label: "FC" },
          { color: "#f97316", label: "Inicio fatiga", dashed: true },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={20} height={8}>
              {l.dashed
                ? <line x1={0} y1={4} x2={20} y2={4} stroke={l.color} strokeWidth={1.5} strokeDasharray="3,2" />
                : <line x1={0} y1={4} x2={20} y2={4} stroke={l.color} strokeWidth={2} />
              }
            </svg>
            <span style={{ fontSize: 10, color: C.secondary }}>{l.label}</span>
          </div>
        ))}
      </div>
      {seriesInsights?.second_half_degradation && (
        <p style={{ fontSize: 10, color: C.secondary, marginTop: 8, lineHeight: 1.4 }}>
          {seriesInsights.second_half_degradation.interpretation}
        </p>
      )}
    </div>
  );
}

const ZONE_COLORS = ["#93c5fd","#60a5fa","#4ade80","#fb923c","#ef4444","#dc2626","#b91c1c"];

function ZoneBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <span style={{ fontSize: 10, color: C.muted, width: 18, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: C.bg, borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct * 1.8, 100)}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 10, color: C.secondary, width: 30, textAlign: "right", flexShrink: 0 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

function SentimentDot({ s }: { s: string }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: "50%", display: "inline-block", flexShrink: 0, marginTop: 2,
      background: s === "positivo" ? C.greenAccent : s === "negativo" ? "#ef4444" : C.muted,
    }} />
  );
}

// ── Post-ride view ─────────────────────────────────────────────────────────
function PostRideView({ bundle, briefLoading, onToggle, onChat }: {
  bundle: Bundle;
  briefLoading: boolean;
  onToggle: () => void;
  onChat: () => void;
}) {
  const { activity, analysis, brief, series_insights } = bundle;
  const gs = analysis?.garmin_summary;
  const ds = analysis?.derived_summary;
  const qb = brief?.quick_brief;
  const plan = brief?.three_day_plan;
  const climbs = analysis?.climbs ?? [];
  const zones = analysis?.zones;
  const si = series_insights;
  const typeLabel = gs?.type?.includes("mountain") ? "MTB"
    : gs?.type?.includes("cycling") ? "Ciclismo"
    : gs?.type?.includes("run") ? "Running" : "Actividad";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── 1. TOPBAR ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.purpleText, margin: 0 }}>Post-ride</h2>
          <p style={{ fontSize: 12, color: C.secondary, margin: "2px 0 0", lineHeight: 1.4 }}>
            {gs ? fmtDate(gs.start_date) : ""} · {gs ? fmtMin(gs.moving_minutes) : ""}
          </p>
        </div>
        <span style={{ background: C.greenBg, color: C.green, borderRadius: 99, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
          {typeLabel}
        </span>
      </div>

      {/* ── 2. VEREDICTO ── */}
      {briefLoading && !qb && <AiLoadingCard />}

      {qb && (
        <div style={{ background: C.purpleText, borderRadius: 16, padding: "16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <ApexBadge />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.3, flex: 1 }}>
              {qb.headline}
            </p>
            <span style={{ background: C.purple, color: "#fff", borderRadius: 99, padding: "4px 12px", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
              {qb.score}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
              {qb.score_label}
            </span>
          </div>
          {qb.veredicto && (
            <p style={{ color: C.purplePale, fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
              {qb.veredicto}
            </p>
          )}
        </div>
      )}

      {/* ── 3. LA RUTA ── */}
      {gs && (
        <div>
          <SectionHead badge={<MotorBadge />}>La ruta</SectionHead>
          <Card>
            <div style={{ height: 130, borderRadius: 8, background: "#D8E8D0", marginBottom: 12, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="100%" height="130" viewBox="0 0 320 130" style={{ position: "absolute", inset: 0 }}>
                {climbs.length > 0 ? (
                  <>
                    <path
                      d={`M 20,100 ${climbs.map((c) => {
                        const x1 = 20 + (c.start_min / gs.elapsed_minutes) * 280;
                        const x2 = 20 + ((c.start_min + c.duration_min) / gs.elapsed_minutes) * 280;
                        const y = 100 - (c.elevation_gain_m / 150) * 60;
                        return `L ${x1},100 Q ${(x1 + x2) / 2},${y} ${x2},100`;
                      }).join(" ")} L 300,100`}
                      fill="none" stroke={C.purple} strokeWidth="2.5" strokeLinecap="round"
                    />
                    <circle cx="20" cy="100" r="5" fill={C.greenAccent} />
                    <circle cx="300" cy="100" r="5" fill="#ef4444" />
                    {climbs.map((c, i) => {
                      const x = 20 + ((c.start_min + c.duration_min / 2) / gs.elapsed_minutes) * 280;
                      const y = 100 - (c.elevation_gain_m / 150) * 60;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="10" fill={C.purple} />
                          <text x={x} y={y + 4} textAnchor="middle" fontSize="8" fill="#fff" fontWeight="800">S{i + 1}</text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  <path d="M 20,80 Q 80,40 160,65 Q 240,90 300,55" fill="none" stroke={C.purple} strokeWidth="2.5" strokeLinecap="round" />
                )}
              </svg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
              {[
                { label: "Distancia", val: `${gs.distance_km.toFixed(1)} km` },
                { label: "Desnivel",  val: `${Math.round(gs.elevation_m)} m` },
                { label: "Energía",   val: `${Math.round(ds?.energy_kj ?? 0)} kJ` },
                { label: "TSS",       val: `${Math.round(gs.garmin_tss ?? ds?.estimated_tss ?? 0)}` },
              ].map(m => (
                <div key={m.label} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 9, color: C.muted, margin: "0 0 2px", textTransform: "uppercase" }}>{m.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.purpleText, margin: 0 }}>{m.val}</p>
                </div>
              ))}
            </div>
            <ElevationProfile climbs={climbs} totalMin={gs.elapsed_minutes} />
          </Card>
        </div>
      )}

      {/* ── 4. SUBIDAS ── */}
      {climbs.length > 0 && (
        <div>
          <SectionHead badge={<MotorBadge />}>Subidas</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {climbs.map((c, i) => {
              const cadFatigue = si?.cadence_fatigue_per_climb?.[i];
              const bvw = si?.best_vs_worst_climb;
              const isBest = bvw ? c.vam === bvw.best_vam : false;
              const vamDelta = bvw && i > 0 ? `${((c.vam - bvw.best_vam) / bvw.best_vam * 100).toFixed(0)}%` : null;
              return (
                <div key={i}>
                  <div style={{ background: C.card, borderRadius: "10px 10px 0 0", border: `1px solid ${C.border}`, borderBottom: "none", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.purple, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                      S{i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>
                        km {(c.start_min * (analysis?.derived_summary.avg_speed_kmh ?? 15) / 60).toFixed(1)} · {(c.distance_m / 1000).toFixed(2)} km
                      </p>
                      <p style={{ fontSize: 10, color: C.secondary, margin: "2px 0 0" }}>
                        {c.avg_grade_pct.toFixed(1)}% · +{Math.round(c.elevation_gain_m)} m
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: isBest ? C.green : C.purpleText, margin: 0 }}>
                        {Math.round(c.vam)}
                      </p>
                      <p style={{ fontSize: 9, color: C.muted, margin: 0 }}>m/h</p>
                      {isBest ? (
                        <span style={{ background: C.greenBg, color: C.green, borderRadius: 99, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>↑ mejor</span>
                      ) : vamDelta ? <DeltaPill delta={vamDelta} /> : null}
                    </div>
                  </div>
                  <div style={{ background: "#F9F8F5", borderRadius: "0 0 10px 10px", border: `1px solid ${C.border}`, borderTop: "none", padding: "7px 14px" }}>
                    <p style={{ fontSize: 10, color: C.secondary, margin: 0, lineHeight: 1.5 }}>
                      {c.avg_power ? `${Math.round(c.avg_power)}W · ` : ""}
                      {c.avg_cadence ? `${Math.round(c.avg_cadence)} rpm · ` : ""}
                      {c.avg_hr ? `FC ${Math.round(c.avg_hr)} bpm` : ""}
                      {cadFatigue && cadFatigue.cadence_drop_pct > 5 ? ` · cadencia ↓${cadFatigue.cadence_drop_pct.toFixed(0)}%` : ""}
                      {" · "}{c.climb_type.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. ZONAS ── */}
      {zones && (
        <div>
          <SectionHead badge={<MotorBadge />}>¿Entrené donde debía?</SectionHead>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 8px", textTransform: "uppercase" }}>Potencia</p>
                {Object.entries(zones.power).map(([z, data], i) => (
                  <ZoneBar key={z} label={z} pct={data.pct} color={ZONE_COLORS[i] ?? C.muted} />
                ))}
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 8px", textTransform: "uppercase" }}>FC</p>
                {Object.entries(zones.heart_rate).map(([z, data], i) => (
                  <ZoneBar key={z} label={z} pct={data.pct} color={ZONE_COLORS[i + 2] ?? C.muted} />
                ))}
              </div>
            </div>
            {si?.cardiac_decoupling && (
              <div style={{ marginTop: 12, background: C.purpleLight, borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 10, color: C.purpleText, margin: 0, lineHeight: 1.5 }}>
                  <ApexBadge /> <span style={{ marginLeft: 6 }}>{si.cardiac_decoupling.interpretation}</span>
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── 6. ¿ESTÁS MEJORANDO? ── */}
      {qb && (
        <div style={{ border: `1.5px solid ${C.purple}`, borderRadius: 16, padding: "14px 14px" }}>
          <SectionHead badge={<ApexBadge />}>¿Estás mejorando?</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qb.highlights.slice(0, 4).map((h, i) => {
              const isPos = h.sentimiento === "positivo";
              const isNeg = h.sentimiento === "negativo";
              const barPct   = isPos ? 78 : isNeg ? 28 : 52;
              const barColor = isPos ? C.greenAccent : isNeg ? "#ef4444" : C.muted;
              return (
                <div key={i} style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "12px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <SentimentDot s={h.sentimiento} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.text, flex: 1 }}>{h.titulo}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.purpleText }}>{h.valor}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <div style={{ background: C.bg, borderRadius: 7, border: `1px solid ${C.border}`, padding: "7px 9px" }}>
                      <p style={{ fontSize: 9, color: C.muted, margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase" }}>vs reciente</p>
                      {h.delta ? <DeltaPill delta={h.delta} /> : <span style={{ fontSize: 10, color: C.muted }}>sin historial</span>}
                      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
                        <div style={{ width: `${barPct}%`, height: "100%", background: barColor, borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 7, border: `1px solid ${C.border}`, padding: "7px 9px" }}>
                      <p style={{ fontSize: 9, color: C.muted, margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase" }}>contexto</p>
                      <p style={{ fontSize: 10, color: C.secondary, margin: 0, lineHeight: 1.35 }}>
                        {h.contexto.length > 60 ? h.contexto.slice(0, 60) + "…" : h.contexto}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: 10, color: C.purplePale, margin: 0, lineHeight: 1.4 }}>{h.detalle}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6b. SEÑALES CONECTADAS ── */}
      {brief?.correlations && brief.correlations.length > 0 && (
        <div style={{ border: `1.5px solid ${C.purple}`, borderRadius: 16, padding: "14px 14px" }}>
          <SectionHead badge={<ApexBadge />}>Señales conectadas</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {brief.correlations.map((corr, i) => {
              const isHigh = corr.severity === "high";
              return (
                <div key={i} style={{
                  background: isHigh ? C.redBg : C.amberBg,
                  border: `1px solid ${isHigh ? "#FECACA" : "#FDE68A"}`,
                  borderRadius: 10, padding: "12px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {corr.systems.map((sys, j) => (
                      <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ background: C.purpleText, color: "#fff", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{sys}</span>
                        {j < corr.systems.length - 1 && <span style={{ color: C.purple, fontWeight: 800, fontSize: 13 }}>↔</span>}
                      </span>
                    ))}
                  </div>
                  {corr.root_cause && (
                    <p style={{ fontSize: 11, color: isHigh ? C.red : C.amber, fontStyle: "italic", margin: "0 0 6px", lineHeight: 1.4 }}>
                      {corr.root_cause}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.5 }}>{corr.insight}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. ¿QUÉ HAGO MAÑANA? ── */}
      {plan && (
        <div style={{ border: `1.5px solid ${C.purple}`, borderRadius: 16, padding: "14px 14px" }}>
          <SectionHead badge={<ApexBadge />}>¿Qué hago mañana?</SectionHead>
          <p style={{ fontSize: 11, color: C.secondary, marginBottom: 12, lineHeight: 1.5 }}>{plan.contexto}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.dias.map((d, i) => (
              <div key={i} style={{
                background: i === 0 ? "#E1F5EE" : C.card,
                borderLeft: `3px solid ${i === 0 ? C.greenAccent : C.border}`,
                borderRadius: "0 8px 8px 0", padding: "10px 12px",
                border: i === 0 ? undefined : `1px solid ${C.border}`,
              }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: i === 0 ? "#1D9E75" : C.muted, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 0.8 }}>{d.dia}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>{d.tipo}</p>
                <p style={{ fontSize: 11, color: C.secondary, margin: "0 0 4px", lineHeight: 1.4 }}>{d.descripcion}</p>
                <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{d.duracion} · {d.intensidad}</p>
                {d.si_te_sientes_mal && (
                  <p style={{ fontSize: 10, color: C.amber, marginTop: 4, margin: "4px 0 0", background: C.amberBg, borderRadius: 4, padding: "3px 6px", display: "inline-block" }}>
                    Si no responde: {d.si_te_sientes_mal.slice(0, 70)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 8. BOTONES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingBottom: 24 }}>
        <button onClick={onChat} style={{ background: C.purple, color: "#fff", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
          💬 Hablar con IA
        </button>
        <button onClick={onToggle} style={{ background: C.purpleLight, color: C.purpleText, borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
          Análisis técnico →
        </button>
      </div>
    </div>
  );
}

// ── Análisis view ──────────────────────────────────────────────────────────
function AnalisisView({ bundle, onToggle, onChat }: { bundle: Bundle; onToggle: () => void; onChat: () => void }) {
  const { analysis, brief, series_insights, ftp_profile } = bundle;
  const [showRawData, setShowRawData] = useState(false);
  const gs = analysis?.garmin_summary;
  const ds = analysis?.derived_summary;
  const pp = analysis?.power_profile;
  const fat = analysis?.fatigue;
  const ps = analysis?.performance_scores;
  const si = series_insights;
  const p2 = brief?.phase_2_deep_analysis;
  const POWER_WINDOWS = ["1s","5s","1min","5min","20min","60min"] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── 1. GRÁFICA POTENCIA + FC ── */}
      {analysis && (
        <div>
          <SectionHead>Potencia y FC</SectionHead>
          <PowerHRChart analysis={analysis} seriesInsights={si} />
        </div>
      )}

      {/* ── 2. CURVA DE PODER ── */}
      {pp && (
        <div>
          <SectionHead>Curva de poder</SectionHead>
          <Card>
            {POWER_WINDOWS.map((w, i) => {
              const val  = pp[w]?.avg_power ?? null;
              const best = ftp_profile?.power_curve_best?.[w]?.power ?? null;
              const isPR = best != null && val != null && val >= best * 0.98;
              const delta = (best != null && val != null) ? `${((val / best - 1) * 100).toFixed(0)}%` : null;
              const barW = val && pp["1s"]?.avg_power ? Math.max(20, (val / pp["1s"].avg_power) * 100) : 40;
              const opacity = 1 - i * 0.13;
              return (
                <div key={w} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: C.muted, width: 30, flexShrink: 0 }}>{w}</span>
                  <div style={{ flex: 1, height: 24, background: C.bg, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(barW, 100)}%`, height: "100%", background: C.purpleText, borderRadius: 4, opacity }} />
                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                      {val ? `${Math.round(val)}W` : "—"}
                    </span>
                  </div>
                  {isPR ? (
                    <span style={{ background: C.amberBg, color: C.amber, borderRadius: 99, padding: "2px 7px", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>PR</span>
                  ) : delta ? (
                    <DeltaPill delta={`${delta.startsWith("-") ? "" : "+"}${delta}`} />
                  ) : <span style={{ width: 32 }} />}
                </div>
              );
            })}
            {analysis?.athlete_profile && (
              <p style={{ fontSize: 10, color: C.secondary, marginTop: 8, lineHeight: 1.4 }}>
                Perfil: <strong style={{ color: C.purpleText }}>{analysis.athlete_profile.primary_type}</strong> · {analysis.athlete_profile.strengths[0]}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── 3. ANÁLISIS DE FATIGA ── */}
      {fat && (
        <div style={{ border: `1.5px solid ${C.purple}`, borderRadius: 16, padding: "14px 14px" }}>
          <SectionHead badge={<ApexBadge />}>Análisis de fatiga</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Inicio fatiga",    val: fat.fatigue_onset_min != null ? `min ${Math.round(fat.fatigue_onset_min)}` : "No detectada", ok: 999, warn: 60 },
              { label: "Caída potencia",   val: fat.power_drop_pct != null ? `${fat.power_drop_pct.toFixed(1)}%` : "—", ok: 5, warn: 12, invert: true },
              { label: "Desacoplamiento",  val: si?.cardiac_decoupling ? `${(si.cardiac_decoupling.decoupling_ratio * 100 - 100).toFixed(1)}%` : "—", ok: 3, warn: 7, invert: true },
              { label: "Stamina final",    val: si?.stamina_depletion ? `${Math.round(si.stamina_depletion.stamina_end_pct)}%` : "—", ok: 80, warn: 60 },
            ].map(m => {
              const n  = parseFloat(m.val.replace(/[^0-9.-]/g, ""));
              const color = isNaN(n) ? C.secondary : m.invert ? semaforo(100 - n, 100 - m.warn, 100 - m.ok) : semaforo(n, m.ok, m.warn);
              const bg    = isNaN(n) ? C.bg : m.invert ? semaforoBg(100 - n, 100 - m.warn, 100 - m.ok) : semaforoBg(n, m.ok, m.warn);
              return (
                <div key={m.label} style={{ background: C.bg, borderRadius: 8, padding: "10px 10px", border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 9, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", fontWeight: 700 }}>{m.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color, margin: "0 0 4px" }}>{m.val}</p>
                  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: isNaN(n) ? "40%" : `${Math.min(Math.abs(n) * 5, 100)}%`, height: "100%", background: color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
          {analysis?.climbs && analysis.climbs.length > 1 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Repeatability de subidas</p>
              {analysis.climbs.map((c, i) => {
                const bestVam = Math.max(...analysis.climbs.map(x => x.vam));
                const pct = bestVam > 0 ? (c.vam / bestVam) * 100 : 0;
                const color = pct >= 90 ? C.purple : pct >= 70 ? "#f97316" : "#ef4444";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: C.muted, width: 18 }}>S{i + 1}</span>
                    <div style={{ flex: 1, height: 10, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color, width: 40, textAlign: "right" }}>{Math.round(c.vam)} m/h</span>
                  </div>
                );
              })}
            </div>
          )}
          {si?.best_vs_worst_climb && (
            <p style={{ fontSize: 10, color: C.purplePale, margin: 0, lineHeight: 1.4 }}>
              {si.best_vs_worst_climb.interpretation}
            </p>
          )}
        </div>
      )}

      {/* ── 4. ANÁLISIS FISIOLÓGICO PROFUNDO ── */}
      <div style={{ border: `1.5px solid ${C.purple}`, borderRadius: 16, padding: "14px 14px" }}>
        <SectionHead badge={<ApexBadge label="ApexAI Premium" />}>Análisis fisiológico profundo</SectionHead>
        <div style={{ background: C.purpleText, borderRadius: 10, padding: "14px 14px", position: "relative", overflow: "hidden" }}>
          <p style={{ fontSize: 9, letterSpacing: 1, color: C.purpleMid, textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
            Causa → Mecanismo → Consecuencia
          </p>
          {p2 ? (
            <>
              {(() => {
                const sentences = p2.medical_interpretation.split(/\n+/).filter(Boolean);
                const blocks = [
                  { label: "CAUSA",       text: sentences[0] ?? "" },
                  { label: "MECANISMO",   text: sentences[1] ?? "" },
                  { label: "CONSECUENCIA", text: sentences[2] ?? "" },
                ];
                return blocks.map((b, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 9, color: C.purpleMid, textTransform: "uppercase", fontWeight: 700, margin: "0 0 4px" }}>{b.label}</p>
                    <p style={{ fontSize: 11, color: C.purpleDeep, margin: 0, lineHeight: 1.5 }}>{b.text.slice(0, 180)}{b.text.length > 180 ? "…" : ""}</p>
                    {i < 2 && <div style={{ textAlign: "center", margin: "10px 0", color: C.purple, fontSize: 16 }}>↓</div>}
                  </div>
                ));
              })()}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #26215C)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 14 }}>
                <button style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "90%" }}>
                  Desbloquear con Premium
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: C.purplePale, fontSize: 11 }}>Genera el brief de esta actividad primero.</p>
          )}
        </div>
      </div>

      {/* ── 5. VER TODA LA DATA ── */}
      {gs && ds && ps && (
        <div>
          <button
            onClick={() => setShowRawData(v => !v)}
            style={{ width: "100%", background: C.purpleLight, color: C.purpleText, border: "none", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: showRawData ? 10 : 0 }}
          >
            {showRawData ? "▲ Ocultar datos" : "▼ Ver toda la data"}
          </button>
          {showRawData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  title: "Resumen Garmin", apex: false,
                  rows: [
                    ["Distancia", `${gs.distance_km.toFixed(2)} km`],
                    ["Tiempo movimiento", fmtMin(gs.moving_minutes)],
                    ["Desnivel", `${Math.round(gs.elevation_m)} m`],
                    ["Calorías", `${gs.calories}`],
                    ["FC media", gs.avg_hr ? `${Math.round(gs.avg_hr)} bpm` : "—"],
                    ["FC máx", gs.max_hr ? `${Math.round(gs.max_hr)} bpm` : "—"],
                    ["Potencia media", gs.avg_power ? `${Math.round(gs.avg_power)} W` : "—"],
                    ["Potencia máx", gs.max_power ? `${Math.round(gs.max_power)} W` : "—"],
                    ["NP Garmin", gs.garmin_np ? `${Math.round(gs.garmin_np)} W` : "—"],
                    ["TSS", gs.garmin_tss ? `${Math.round(gs.garmin_tss)}` : "—"],
                    ["IF", gs.garmin_if ? gs.garmin_if.toFixed(3) : "—"],
                    ["VO2max", gs.vo2max ? `${gs.vo2max}` : "—"],
                  ] as [string, string][],
                },
                {
                  title: "Métricas Apex calculadas", apex: true,
                  rows: [
                    ["NP estimado", `${Math.round(ds.estimated_np)} W`],
                    ["Variability Index", ds.vi ? ds.vi.toFixed(3) : "—"],
                    ["IF estimado", ds.estimated_if.toFixed(3)],
                    ["TSS estimado", ds.estimated_tss ? `${Math.round(ds.estimated_tss)}` : "—"],
                    ["Energía", `${Math.round(ds.energy_kj)} kJ`],
                    ["Eficiencia aeróbica", ds.aerobic_efficiency ? `${ds.aerobic_efficiency.toFixed(3)} W/bpm` : "—"],
                    ["Cadencia media", ds.avg_cadence_rpm ? `${Math.round(ds.avg_cadence_rpm)} rpm` : "—"],
                    ["% pedaleo", ds.pedaling_pct ? `${ds.pedaling_pct.toFixed(1)}%` : "—"],
                    ["Clasificación", ds.ride_classification],
                  ] as [string, string][],
                },
                {
                  title: "Scores de rendimiento", apex: true,
                  rows: [
                    ["Repeatability", ps.repeatability_score.score != null ? `${ps.repeatability_score.score.toFixed(1)}/100` : "—"],
                    ["Costo metabólico", ps.metabolic_cost_score.score != null ? `${ps.metabolic_cost_score.score.toFixed(1)}/100` : "—"],
                    ["Eficiencia", ps.efficiency_score.score != null ? `${ps.efficiency_score.score.toFixed(1)}/100` : "—"],
                    ["Pacing", ps.pacing_score.score != null ? `${ps.pacing_score.score.toFixed(1)}/100` : "—"],
                    ["Carga muscular", ps.muscular_load_score.score != null ? `${ps.muscular_load_score.score.toFixed(1)}/100` : "—"],
                    ["Overall", ps.overall_score.score != null ? `${ps.overall_score.score.toFixed(1)}/100` : "—"],
                  ] as [string, string][],
                },
              ].map(section => (
                <Card key={section.title}>
                  <div style={{ display: "inline-flex", background: C.purple, color: "#fff", borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700, marginBottom: 10 }}>
                    {section.title}
                  </div>
                  {section.rows.map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.bg}` }}>
                      <span style={{ fontSize: 11, color: C.secondary }}>{k}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: section.apex ? C.purple : C.text }}>{v}</span>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 6. BOTONES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingBottom: 24 }}>
        <button onClick={onChat} style={{ background: C.purple, color: "#fff", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
          💬 Hablar con IA
        </button>
        <button onClick={onToggle} style={{ background: C.card, color: C.purpleText, borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, cursor: "pointer" }}>
          ← Post-ride
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export function ActivityClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [view, setView]               = useState<"postride" | "analysis">("postride");
  const [activities, setActivities]   = useState<ActivityItem[]>([]);
  const [typeFilter, setTypeFilter]   = useState<TypeFilter>("all");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [bundle, setBundle]           = useState<Bundle | null>(null);
  const [loading, setLoading]           = useState(true);
  const [briefLoading, setBriefLoading] = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);

  useEffect(() => {
    fetch("/api/activity/list")
      .then(r => r.json())
      .then((list: ActivityItem[]) => {
        setActivities(list);
        const paramId = searchParams.get("id");
        const first = paramId ?? String(list[0]?.activity_id ?? "");
        setSelectedId(first);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  const loadBundle = useCallback(async (id: string) => {
    setLoading(true);
    setBundle(null);
    try {
      const res = await fetch(`/api/activity?id=${id}`);
      const data: Bundle = await res.json();
      setBundle(data);
      if (!data.brief) {
        setBriefLoading(true);
        fetch(`/api/activity/brief?id=${id}`)
          .then(r => r.json())
          .then(b => { if (b.ok && b.brief) setBundle(prev => prev ? { ...prev, brief: b.brief } : prev); })
          .finally(() => setBriefLoading(false));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const filteredActivities = typeFilter === "all"
    ? activities
    : activities.filter(a => getTypeGroup(a.type) === typeFilter);

  const visibleIds  = new Set(filteredActivities.map(a => String(a.activity_id)));
  const effectiveId = selectedId && visibleIds.has(selectedId)
    ? selectedId
    : String(filteredActivities[0]?.activity_id ?? "");

  useEffect(() => {
    if (effectiveId) loadBundle(effectiveId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveId, loadBundle]);

  function TypePills() {
    const counts: Record<TypeFilter, number> = { all: activities.length, mtb: 0, road: 0, running: 0, other: 0 };
    for (const a of activities) counts[getTypeGroup(a.type)]++;
    return (
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        {TYPE_OPTIONS.filter(o => o.key === "all" || counts[o.key] > 0).map(o => {
          const isActive = typeFilter === o.key;
          return (
            <button key={o.key} onClick={() => {
              setTypeFilter(o.key);
              const first = activities.find(a => o.key === "all" || getTypeGroup(a.type) === o.key);
              if (first) { setSelectedId(String(first.activity_id)); router.replace(`/activity?id=${first.activity_id}`); }
            }} style={{
              flexShrink: 0, borderRadius: 99, padding: "5px 12px",
              background: isActive ? C.purple : C.card,
              color: isActive ? "#fff" : C.secondary,
              border: `1px solid ${isActive ? C.purple : C.border}`,
              fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer",
              whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span>{o.icon}</span><span>{o.label}</span>
              {o.key !== "all" && <span style={{ opacity: 0.6, fontSize: 10 }}>{counts[o.key]}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  function ActivitySelector() {
    return (
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
        {filteredActivities.map(a => {
          const isActive = String(a.activity_id) === effectiveId;
          return (
            <button key={a.activity_id}
              onClick={() => { setSelectedId(String(a.activity_id)); router.replace(`/activity?id=${a.activity_id}`); }}
              style={{
                flexShrink: 0, borderRadius: 10, padding: "7px 12px",
                background: isActive ? C.purpleText : C.card,
                color: isActive ? "#fff" : C.secondary,
                border: `1px solid ${isActive ? C.purpleText : C.border}`,
                fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
              }}>
              <span style={{ display: "block", fontSize: 9, opacity: 0.75 }}>{fmtDate(a.date)}</span>
              <span>{a.name?.length > 18 ? a.name.slice(0, 18) + "…" : a.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function Toggle() {
    return (
      <div style={{ display: "flex", background: C.bg, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
        {(["postride","analysis"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, borderRadius: 8, padding: "8px 0", border: "none", cursor: "pointer",
            background: view === v ? C.card : "transparent",
            color: view === v ? C.purpleText : C.muted,
            fontSize: 12, fontWeight: view === v ? 700 : 500,
            boxShadow: view === v ? C.shadow : "none",
            transition: "all 0.15s",
          }}>
            {v === "postride" ? "Post-ride" : "Análisis"}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <ApexStyles />

      {/* Nav */}
      <div style={{ background: C.bg, padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: C.secondary, textDecoration: "none", fontSize: 14 }}>← Inicio</Link>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Actividad</span>
        <div style={{ width: 52 }} />
      </div>

      <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 40px" }}>

        {activities.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <TypePills />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <ActivitySelector />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Toggle />
        </div>

        {loading ? (
          <ShimmerSkeleton heights={[120, 80, 200, 160]} />
        ) : bundle ? (
          view === "postride"
            ? <PostRideView bundle={bundle} briefLoading={briefLoading} onToggle={() => setView("analysis")} onChat={() => setChatOpen(true)} />
            : <AnalisisView bundle={bundle} onToggle={() => setView("postride")} onChat={() => setChatOpen(true)} />
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
            <p style={{ fontSize: 14 }}>Sin actividades disponibles</p>
          </div>
        )}
      </div>

      {chatOpen && bundle && (
        <ApexChat
          section="activity"
          context={{ analysis: bundle.analysis, brief: bundle.brief, activity: bundle.activity }}
          subtitle={bundle.analysis?.garmin_summary
            ? `${String(bundle.analysis.garmin_summary.name ?? "").slice(0, 24)} · Score ${bundle.brief?.quick_brief?.score ?? "—"}`
            : undefined}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
