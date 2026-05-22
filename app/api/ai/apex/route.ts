import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  readActivityIndex,
  readJson,
  readDataJson,
  readPIJson,
  resolveBriefFile,
  getUserDataDir,
} from "@/lib/data";

// ── types ─────────────────────────────────────────────────────────────────────

type CallType = "verdict" | "athlete_profile" | "action_plan" | "full_report" | "chat" | "weekly_plan" | "athlete_context" | "structure_workout";

interface AthleteData {
  primary_sport: string; ftp: number; max_hr: number; weight_kg: number;
  goal: string; goal_date: string; training_phase: string;
  complementary_activities: string[];
}

interface SessionData {
  tss: number; if_apex: number; duration_min: number; vi: number;
  muscular_load_score: number; active_cadence_rpm: number;
  climb_repeatability_pct: number; z4_plus_pct: number; z7_pct: number;
  ride_classification: string; limiters: string[];
}

interface StateData {
  tsb: number; ctl: number; atl: number;
  hrv_status: string; sleep_score: number;
  consecutive_bike_days: number; days_since_rest: number; peak_session_tss: number;
}

interface StructureWorkoutInput {
  workout_name: string;
  actividad_descripcion: string;
  por_que_fisiologico: string;
  ftp: number;
  max_hr: number;
}

interface ApexRequest {
  call_type: CallType;
  activity_id?: string;
  message?: string;
  athlete_data?: AthleteData;
  session_data?: SessionData;
  state_data?: StateData;
  structure_workout_input?: StructureWorkoutInput;
}

const MODELS = {
  haiku:  "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus:   "claude-opus-4-6",
} as const;

const CHAT_ANALYSIS_KEYWORDS = [
  "por qué","porqué","porque","listo","debo","recomienda","plan",
  "comparar","historial","mejor","mejorar","estrategia","cómo",
  "debería","puedo","próxima","siguiente","semana",
];

// ── athlete metrics (CTL/ATL/TSB + HRV + sleep) ───────────────────────────────

function computeAthleteMetrics(userDir?: string) {
  const idx = readActivityIndex(userDir);
  const profile  = readDataJson<Record<string,unknown>>("profile.json", userDir);
  const baseline = readPIJson<Record<string,unknown>>("athlete_baseline.json", userDir);
  const ftpProf  = readPIJson<Record<string,unknown>>("ftp_profile.json", userDir);

  const maxHr = Number((profile as {max_hr?: number} | null)?.max_hr ?? 185);
  const lthr  = maxHr * 0.88;
  const ftp   = Number((profile as {ftp_apex?: number} | null)?.ftp_apex
             ?? (ftpProf as {ftp_current?: number} | null)?.ftp_current
             ?? (baseline?.ftp_model as {ftp_estimated?: number} | undefined)?.ftp_estimated
             ?? 230);
  const weightKg = Number((profile as {weight_kg?: number} | null)?.weight_kg ?? null);

  // Build TSS map
  const tssByDate: Record<string, number> = {};
  for (const a of idx) {
    const aid   = String(a.activity_id ?? "");
    const dt    = String(a.date ?? "").slice(0, 10);
    if (!dt || !aid) continue;
    const anaPath = resolveBriefFile(a.analysis_file as string);
    const ana   = anaPath ? readJson<Record<string,unknown>>(anaPath) : null;
    const ds    = (ana?.derived_summary as Record<string,unknown>) ?? {};
    const gs    = (ana?.garmin_summary  as Record<string,unknown>) ?? {};
    let tss: number | null = (ds.estimated_tss ?? gs.garmin_tss) as number | null;
    if (!tss) {
      // hrTSS fallback
      const avgHr = Number(gs.avg_hr ?? 0);
      const mins  = Number(gs.moving_minutes ?? 0);
      if (avgHr > 0 && mins > 0) tss = (mins / 60) * Math.pow(avgHr / lthr, 2) * 100;
    }
    if (tss && tss > 0) tssByDate[dt] = (tssByDate[dt] ?? 0) + tss;
  }

  // EMA CTL(42) / ATL(7) from Jan 1 to today
  const today = new Date(); today.setHours(0,0,0,0);
  const startDate = new Date(today); startDate.setMonth(startDate.getMonth() - 4);
  let ctl = 0, atl = 0;
  const tslHistory: { date: string; ctl: number; atl: number; tsb: number }[] = [];
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const tss = tssByDate[key] ?? 0;
    ctl = ctl + (tss - ctl) / 42;
    atl = atl + (tss - atl) / 7;
    tslHistory.push({ date: key, ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round((ctl - atl) * 10) / 10 });
  }
  const tsb = ctl - atl;
  const ctl7dAgo = tslHistory.length >= 8 ? tslHistory[tslHistory.length - 8].ctl : ctl;
  const ctlTrend = ctl - ctl7dAgo;

  // TSS last 7 days + active days
  let tss7 = 0, activeDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const t = tssByDate[key] ?? 0;
    tss7 += t;
    if (t > 0) activeDays++;
  }

  // Recent 6 activities (for Historial Reciente)
  const recent6 = [...idx].reverse().slice(0, 6).map(a => {
    const aid  = String(a.activity_id ?? "");
    const anaPath = resolveBriefFile(a.analysis_file as string);
    const ana  = anaPath ? readJson<Record<string,unknown>>(anaPath) : null;
    const ds   = (ana?.derived_summary as Record<string,unknown>) ?? {};
    const gs   = (ana?.garmin_summary  as Record<string,unknown>) ?? {};
    let tss: number | null = (ds.estimated_tss ?? gs.garmin_tss) as number | null;
    if (!tss) {
      const avgHr = Number(gs.avg_hr ?? 0);
      const mins  = Number(gs.moving_minutes ?? 0);
      if (avgHr > 0 && mins > 0) tss = Math.round((mins / 60) * Math.pow(avgHr / lthr, 2) * 100);
    }
    return {
      activity_id: aid,
      date: String(a.date ?? "").slice(0, 10),
      name: String(gs.name ?? a.name ?? ""),
      distance_km: Number(gs.distance_km ?? a.distance_km ?? 0),
      avg_hr: Number(gs.avg_hr ?? a.avg_hr ?? null) || null,
      tss: tss ? Math.round(tss) : null,
    };
  });

  // HRV + sleep: read today's or most recent sleep_analysis.json
  let hrvStatus: string | null = null;
  let sleepScore: number | null = null;
  for (let i = 0; i < 5; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const sleepAna = readDataJson<Record<string,unknown>>(`sleep/${dateStr}/sleep_analysis.json`, userDir);
    if (sleepAna) {
      const auto = sleepAna.autonomic_recovery as Record<string,unknown> ?? {};
      const rec  = sleepAna.recovery_summary   as Record<string,unknown> ?? {};
      hrvStatus  = String(auto.hrv_status ?? "");
      sleepScore = Math.round(Number(rec.overall_recovery_score ?? 0)) || null;
      break;
    }
  }

  // Recurrent limiters from baseline
  const limiterCounts: Record<string,number> = {};
  for (const a of idx.slice(-10)) {
    const lim = String(a.primary_limiter ?? "");
    if (lim) limiterCounts[lim] = (limiterCounts[lim] ?? 0) + 1;
  }
  const recurrentLimiters = Object.entries(limiterCounts)
    .filter(([,v]) => v >= 2).sort((a,b) => b[1]-a[1]).map(([k]) => k);

  // primary_type from most recent activity's athlete_profile
  let primaryType: string | null = null;
  for (const a of [...idx].reverse()) {
    const p = resolveBriefFile(a.analysis_file as string);
    const ana = p ? readJson<Record<string,unknown>>(p) : null;
    const ap = ana?.athlete_profile as {primary_type?: string} | undefined;
    if (ap?.primary_type) { primaryType = ap.primary_type; break; }
  }

  // goal from profile.json (correct field names)
  const goalName = (profile as {goal_event?: string} | null)?.goal_event ?? null;
  const goalDate = (profile as {goal_date?: string} | null)?.goal_date ?? null;
  const weeksToGoal = goalDate
    ? Math.max(0, Math.round((new Date(goalDate).getTime() - today.getTime()) / 604800000))
    : null;

  // training_phase: derive from CTL trend since baseline doesn't have it
  const phase = ctlTrend > 2 ? "construcción" : ctlTrend < -2 ? "recuperación" : "mantenimiento";

  // consecutive_bike_days: days in a row with activity up to today
  let consecutiveBikeDays = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if ((tssByDate[d.toISOString().slice(0,10)] ?? 0) > 0) consecutiveBikeDays++;
    else break;
  }

  // peak_session_tss: highest single-day TSS in last 7 days
  let peakSessionTss = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    peakSessionTss = Math.max(peakSessionTss, tssByDate[d.toISOString().slice(0,10)] ?? 0);
  }

  // complementary_activities: non-cycling sports from profile
  const sportFocus = (profile as {sport_focus?: string[]} | null)?.sport_focus ?? [];
  const complementaryActivities = sportFocus.filter(s => !["cycling","mountain_biking"].includes(s));

  return {
    ftp: Math.round(ftp),
    weight_kg: weightKg || null,
    max_hr: maxHr,
    primary_type: primaryType,
    goal: [goalName, goalDate].filter(Boolean).join(" ") || null,
    weeks_to_goal: weeksToGoal,
    training_phase: phase,
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
    hrv_status: hrvStatus,
    sleep_score: sleepScore,
    days_since_hard: (() => {
      const hardThreshold = 100;
      for (let i = 1; i <= 14; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        if ((tssByDate[d.toISOString().slice(0,10)] ?? 0) >= hardThreshold) return i;
      }
      return null;
    })(),
    recurrent_limiters: recurrentLimiters,
    tss_7days: Math.round(tss7),
    active_days: activeDays,
    ctl_trend: Math.round(ctlTrend * 10) / 10,
    recent_activities: recent6,
    tsl_history: tslHistory.slice(-30),
    consecutive_bike_days: consecutiveBikeDays,
    peak_session_tss: Math.round(peakSessionTss),
    complementary_activities: complementaryActivities,
  };
}

// ── athlete context ────────────────────────────────────────────────────────────

function buildAthleteContext(userDir?: string) {
  const baseline = readPIJson<Record<string,unknown>>("athlete_baseline.json", userDir);
  const profile  = readPIJson<Record<string,unknown>>("profile.json", userDir)
                ?? readPIJson<Record<string,unknown>>("../profile.json", userDir);
  const ftpProf  = readPIJson<Record<string,unknown>>("ftp_profile.json", userDir);
  const idx = readActivityIndex(userDir);
  const recent = idx.slice(-5).reverse();

  const recentLines = recent.map(a =>
    `${String(a.date ?? "").slice(0,10)} | ${a.name ?? ""} | TSS ${a.garmin_tss ?? "?"} | NP ${a.garmin_np ?? "?"}W | limiter: ${a.primary_limiter ?? "?"}`
  );

  const ftp = (ftpProf as {ftp_current?: number} | null)?.ftp_current
           ?? ((baseline?.ftp_model as {ftp_estimated?: number} | undefined)?.ftp_estimated);
  const profileTyped = profile as {
    weight_kg?: number; height_cm?: number; age?: number; sex?: string;
    max_hr?: number; goal_event?: string; goal_date?: string; goal_target?: string;
    sport_focus?: string[]; experience_years?: number; weekly_hours_available?: number;
    competition_level?: string; has_coach?: boolean;
    work_type?: string; sleep_goal_hours?: number; injuries?: string[];
    name?: string;
  } | null;

  // primary_type from most recent activity's athlete_profile
  let primaryType: string | undefined;
  for (const a of [...idx].reverse()) {
    const p = resolveBriefFile(a.analysis_file as string);
    const ana = p ? readJson<Record<string,unknown>>(p) : null;
    const ap = ana?.athlete_profile as {primary_type?: string} | undefined;
    if (ap?.primary_type) { primaryType = ap.primary_type; break; }
  }

  // Infer recurrent limiters from recent activities
  const limiterCounts: Record<string, number> = {};
  for (const a of idx.slice(-10)) {
    const lim = a.primary_limiter as string | undefined;
    if (lim) limiterCounts[lim] = (limiterCounts[lim] ?? 0) + 1;
  }
  const recurrentLimiters = Object.entries(limiterCounts)
    .filter(([,v]) => v >= 2).sort((a,b) => b[1]-a[1]).map(([k]) => k);

  // Injuries string for prompt
  const injuriesStr = profileTyped?.injuries?.length
    ? `Lesiones recurrentes: ${profileTyped.injuries.join(", ")}`
    : undefined;

  return {
    ftp_w: ftp,
    weight_kg: profileTyped?.weight_kg,
    height_cm: profileTyped?.height_cm,
    age: profileTyped?.age,
    sex: profileTyped?.sex,
    max_hr: profileTyped?.max_hr ?? (baseline?.physiological_baselines as {max_hr?: number} | undefined)?.max_hr,
    primary_type: primaryType,
    sport_focus: profileTyped?.sport_focus,
    experience_years: profileTyped?.experience_years,
    weekly_hours: profileTyped?.weekly_hours_available,
    competition_level: profileTyped?.competition_level,
    has_coach: profileTyped?.has_coach,
    work_type: profileTyped?.work_type,
    sleep_goal_hours: profileTyped?.sleep_goal_hours,
    injuries: injuriesStr,
    goal: [profileTyped?.goal_event, profileTyped?.goal_target, profileTyped?.goal_date].filter(Boolean).join(" — ") || undefined,
    recurrent_limiters: recurrentLimiters,
    recent_sessions_summary: recentLines.join("\n") || "Sin historial reciente.",
  };
}

function ctxBlock(ctx: ReturnType<typeof buildAthleteContext>): string {
  const lines = [];
  if (ctx.ftp_w)              lines.push(`FTP: ${ctx.ftp_w}W`);
  if (ctx.weight_kg)          lines.push(`Peso: ${ctx.weight_kg} kg`);
  if (ctx.height_cm)          lines.push(`Altura: ${ctx.height_cm} cm`);
  if (ctx.age)                lines.push(`Edad: ${ctx.age} años`);
  if (ctx.sex)                lines.push(`Sexo: ${ctx.sex === "M" ? "Masculino" : "Femenino"}`);
  if (ctx.max_hr)             lines.push(`FC max: ${ctx.max_hr} bpm`);
  if (ctx.primary_type)       lines.push(`Tipo de atleta: ${ctx.primary_type}`);
  if (ctx.sport_focus?.length) lines.push(`Deportes: ${ctx.sport_focus.join(", ")}`);
  if (ctx.experience_years != null) lines.push(`Experiencia: ${ctx.experience_years} años`);
  if (ctx.weekly_hours != null) lines.push(`Horas entrenamiento/sem: ${ctx.weekly_hours}h`);
  if (ctx.competition_level)  lines.push(`Nivel: ${ctx.competition_level}`);
  if (ctx.has_coach != null)  lines.push(`Entrenador: ${ctx.has_coach ? "Sí" : "No"}`);
  if (ctx.work_type)          lines.push(`Trabajo: ${ctx.work_type}`);
  if (ctx.sleep_goal_hours)   lines.push(`Meta de sueño: ${ctx.sleep_goal_hours}h`);
  if (ctx.injuries)           lines.push(ctx.injuries);
  if (ctx.goal)               lines.push(`Objetivo: ${ctx.goal}`);
  if (ctx.recurrent_limiters.length)
    lines.push(`Limitantes recurrentes: ${ctx.recurrent_limiters.join(", ")}`);
  lines.push(`\nÚltimas sesiones:\n${ctx.recent_sessions_summary}`);
  return lines.join("\n");
}

// ── data loaders ───────────────────────────────────────────────────────────────

function loadActivityData(activityId: string, userDir?: string) {
  const idx = readActivityIndex(userDir);
  const entry = idx.find(a => String(a.activity_id) === String(activityId));
  if (!entry) return null;

  const analysisPath = resolveBriefFile(entry.analysis_file as string);
  const analysis = readJson<Record<string,unknown>>(analysisPath);

  const findingsPath = analysisPath?.replace("activity_analysis.json","activity_findings.json");
  const findings = findingsPath ? readJson<unknown>(findingsPath) : null;

  const siPath = analysisPath?.replace("activity_analysis.json","series_insights.json");
  const seriesInsights = siPath ? readJson<Record<string,unknown>>(siPath) : null;

  return { analysis, findings, seriesInsights, entry };
}

function loadRecentAnalyses(currentId?: string, n = 6, userDir?: string) {
  const idx = readActivityIndex(userDir);
  const prev = idx.filter(a => String(a.activity_id) !== String(currentId ?? "")).slice(-n);
  return prev.reverse().map(a => {
    const p = resolveBriefFile(a.analysis_file as string);
    return p ? readJson<Record<string,unknown>>(p) : null;
  }).filter(Boolean) as Record<string,unknown>[];
}

// ── helpers ────────────────────────────────────────────────────────────────────

function parseJson(text: string): unknown {
  // Strip markdown code fences Claude sometimes adds
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(clean);
}

// ── prompts ────────────────────────────────────────────────────────────────────

function promptVerdict(analysis: Record<string,unknown>, ctx: ReturnType<typeof buildAthleteContext>): string {
  const gs = analysis.garmin_summary as Record<string,unknown> ?? {};
  const ds = analysis.derived_summary as Record<string,unknown> ?? {};
  const ps = analysis.performance_scores as Record<string,{score?: number}> ?? {};
  const fa = analysis.fatigue as Record<string,unknown> ?? {};
  // Use Apex-calculated values; fall back to Garmin only if Apex unavailable
  const np  = ds.estimated_np  ?? gs.garmin_np;
  const tss = ds.estimated_tss ?? gs.garmin_tss;
  const IF  = ds.estimated_if  ?? gs.garmin_if;
  return `Eres el motor de análisis de Apex. Responde SOLO con 2 oraciones en español. Sin markdown. Sin bullets.

ATLETA
${ctxBlock(ctx)}

DATOS DE LA ACTIVIDAD
Nombre: ${gs.name ?? ""}
Distancia: ${gs.distance_km} km | Desnivel: ${gs.elevation_m} m | Tiempo: ${gs.moving_minutes} min
TSS: ${tss} | NP: ${np}W | IF: ${IF} | Score global: ${ps.overall_score?.score ?? "?"}
VI: ${ds.vi} | Tipo de ride: ${ds.ride_classification ?? ""}
Caída de potencia: ${fa.power_drop_pct}%

Primera oración: qué tipo de salida fue y qué sistema energético trabajó.
Segunda oración: el dato más positivo concreto y el más importante a mejorar — con número real.`;
}

function promptAthleteProfile(analysis: Record<string,unknown>, ctx: ReturnType<typeof buildAthleteContext>, recent: Record<string,unknown>[]): string {
  const pp = analysis.power_profile as Record<string, Record<string,unknown>> ?? {};
  const histLines = recent.map(a => {
    const gs = a.garmin_summary as Record<string,unknown> ?? {};
    const fa = a.fatigue as Record<string,unknown> ?? {};
    const p2 = a.power_profile as Record<string, Record<string,unknown>> ?? {};
    return `${String(gs.start_date ?? "").slice(0,10)} | NP ${gs.garmin_np}W | TSS ${gs.garmin_tss} | drop ${fa.power_drop_pct}% | 5min ${p2["5min"]?.avg_power}W | 20min ${p2["20min"]?.avg_power}W`;
  });
  const dur = (d: string) => pp[d]?.avg_power ?? "?";
  return `Responde SOLO con JSON válido. Sin texto adicional.

ATLETA
${ctxBlock(ctx)}

CURVA DE POTENCIA (esta sesión)
5s: ${dur("5s")}W | 15s: ${dur("15s")}W | 1min: ${dur("1min")}W | 5min: ${dur("5min")}W | 10min: ${dur("10min")}W | 20min: ${dur("20min")}W | 60min: ${dur("60min")}W

HISTORIAL RECIENTE
${histLines.join("\n") || "Sin historial"}

Clasifica: puncheur=domina 1-5min, climber=domina 10-60min, diesel=distribución plana, all-rounder=equilibrado.

{"primary_type": "puncher|climber|diesel|all-rounder","strengths":["max 3"],"limiters":["max 2"],"development_focus":["max 3 acciones concretas"]}`;
}

function promptActionPlan(findings: unknown, ctx: ReturnType<typeof buildAthleteContext>, analysis: Record<string,unknown>): string {
  const findingsList = Array.isArray(findings) ? findings : (findings as {findings?: unknown[]})?.findings ?? [];
  const fa = analysis.fatigue as Record<string,unknown> ?? {};
  const gs = analysis.garmin_summary as Record<string,unknown> ?? {};
  const ftp = ctx.ftp_w ?? 230;
  return `Responde SOLO con JSON válido. Sin texto adicional.

ATLETA
${ctxBlock(ctx)}

SESIÓN: TSS ${gs.garmin_tss} | NP ${gs.garmin_np}W | IF ${gs.garmin_if}
Caída potencia: ${fa.power_drop_pct}% | Fatiga en min: ${fa.fatigue_onset_min}

FINDINGS (top 8)
${JSON.stringify(findingsList.slice(0,8), null, 2)}

ZONAS (FTP=${ftp}W): Z3 ${Math.round(ftp*0.76)}-${Math.round(ftp*0.87)}W | Z4 ${Math.round(ftp*0.88)}-${Math.round(ftp*0.95)}W | Z5 ${Math.round(ftp*1.06)}-${Math.round(ftp*1.20)}W

[{"priority":1,"action":"...","why":"dato concreto","how":"duración + vatios reales + formato"},{"priority":2,"action":"...","why":"...","how":"..."},{"priority":3,"action":"...","why":"...","how":"..."}]`;
}

function promptFullReport(actData: NonNullable<ReturnType<typeof loadActivityData>>, ctx: ReturnType<typeof buildAthleteContext>, recent: Record<string,unknown>[]): string {
  const { analysis, findings, seriesInsights } = actData;
  const gs = (analysis?.garmin_summary as Record<string,unknown>) ?? {};
  const histLines = recent.map(a => {
    const ags = a.garmin_summary as Record<string,unknown> ?? {};
    const fa = a.fatigue as Record<string,unknown> ?? {};
    return `  ${String(ags.start_date ?? "").slice(0,10)} | ${ags.name} | NP ${ags.garmin_np}W | TSS ${ags.garmin_tss} | drop ${fa.power_drop_pct}%`;
  });
  return `Eres el motor de análisis de Apex. Reporte médico-deportivo en español. Cada sección máximo 150 palabras. Sin markdown excesivo.

ATLETA
${ctxBlock(ctx)}

DATOS COMPLETOS
${JSON.stringify({ garmin: analysis?.garmin_summary, derived: analysis?.derived_summary, zones: analysis?.zones, climbs: analysis?.climbs, fatigue: analysis?.fatigue, scores: analysis?.performance_scores, series_insights: seriesInsights }, null, 2).slice(0, 4000)}

FINDINGS
${JSON.stringify((Array.isArray(findings) ? findings : (findings as {findings?:unknown[]})?.findings ?? []).slice(0,8), null, 2)}

HISTORIAL (últimas ${recent.length} sesiones)
${histLines.join("\n") || "Sin historial"}

Genera EXACTAMENTE estas 9 secciones:
1. Resumen ejecutivo
2. Análisis de carga (TSS, IF, VI, energy_kj)
3. Perfil energético (zonas, ride_classification, curva de potencia)
4. Análisis de ascensos (VAM, cadence_fatigue, best_vs_worst)
5. Fatiga y durabilidad (cardiac_decoupling, second_half_degradation, power_drop)
6. Fortalezas detectadas
7. Limitantes detectados
8. Plan de desarrollo (próximas 2–3 semanas, sesiones con vatios)
9. Contexto histórico

Sin repetir datos entre secciones.`;
}

function buildNextDayPrompt(a: AthleteData, s: SessionData, state: StateData): string {
  const weeksToGoal = a.goal_date
    ? Math.round((new Date(a.goal_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7))
    : null;

  const complementarias = a.complementary_activities?.length
    ? a.complementary_activities.join(" · ")
    : "ninguna registrada";

  return `
Eres el coach de Apex Cycling. Prescribe exactamente qué debe hacer este atleta MAÑANA — un solo día.
Razona en este orden. No saltes pasos. No inventes datos que no estén aquí.

══════════════════════════════════════════
PASO 1 — QUÉ SISTEMAS ESTRESÓ LA SESIÓN DE HOY
══════════════════════════════════════════

Evalúa cada sistema con los datos reales:

CARDIOVASCULAR — estresado alto si IF > 0.80 O Z4+ > 20% O TSS > 100 O duración > 90min
→ IF: ${s.if_apex} · Z4+: ${s.z4_plus_pct}% · TSS: ${s.tss} · duración: ${s.duration_min}min
→ Clasificación: ${s.ride_classification}

MUSCULAR (piernas) — estresado alto si muscular_load > 75 O cadencia < 78rpm O climb_repeatability < 80%
→ muscular_load: ${s.muscular_load_score} · cadencia activa: ${s.active_cadence_rpm}rpm · repeatability: ${s.climb_repeatability_pct}%

SISTEMA NERVIOSO — estresado alto si VI > 1.20 O Z7 > 2%
→ VI: ${s.vi} · Z7: ${s.z7_pct}%

══════════════════════════════════════════
PASO 2 — ESTADO GLOBAL DEL ATLETA HOY
══════════════════════════════════════════

TSB: ${state.tsb} · CTL: ${state.ctl} · ATL: ${state.atl}
HRV anoche: ${state.hrv_status} · Sleep score: ${state.sleep_score}/100
Días consecutivos en bici: ${state.consecutive_bike_days}
Días desde último descanso completo: ${state.days_since_rest}
TSS máximo de los últimos 7 días: ${state.peak_session_tss}

══════════════════════════════════════════
PASO 3 — CONTEXTO DEL ATLETA
══════════════════════════════════════════

Deporte principal: ${a.primary_sport}
FTP: ${a.ftp}W · FC máx: ${a.max_hr}bpm · Peso: ${a.weight_kg}kg
Objetivo: ${a.goal}
${weeksToGoal !== null ? `Semanas al objetivo: ${weeksToGoal}` : "Sin fecha de objetivo definida"}
Fase actual: ${a.training_phase}
Limitantes detectados hoy: ${s.limiters?.join(" · ") || "ninguno"}
Actividades complementarias disponibles: ${complementarias}

══════════════════════════════════════════
PASO 4 — JERARQUÍA DE PRESCRIPCIÓN
══════════════════════════════════════════

La disciplina principal es ${a.primary_sport}. Siempre es la primera opción si el estado lo permite.

OPCIÓN A — ${a.primary_sport.toUpperCase()} (primera opción):
Prescribe SI se cumplen TODAS:
· HRV no es POOR
· TSB > −25
· Días consecutivos < 5
· Al menos un sistema NO está estresado alto

Si prescribes bici, calibra así según sistemas estresados:
· Cardio estresado → Z1 puro, FC máx ${Math.round(a.max_hr * 0.68)}bpm, sin esfuerzo
· Muscular estresado → terreno plano, cadencia alta >92rpm, potencia <${Math.round(a.ftp * 0.55)}W
· SNC estresado → sin variabilidad, sin técnica, pedaleo constante como metrónomo
· Ninguno estresado → sesión de carga según fase: ${a.training_phase}

OPCIÓN B — ACTIVIDAD COMPLEMENTARIA:
Prescribe SI la bici no es óptima PERO el cuerpo puede estimularse en sistemas libres.
Actividades disponibles para este atleta: ${complementarias}

Lógica por sistemas libres:
· Cardio y SNC estresados, muscular tren superior libre → pesas tren superior si disponible
· Cardio y muscular estresados, SNC libre → yoga o movilidad si disponible
· Muscular piernas estresado, cardio moderado → trote suave 25–30min plano FC <${Math.round(a.max_hr * 0.65)}bpm si disponible
· Todos estresados moderado → yoga o movilidad 30min si disponible. Si no hay complementaria disponible → DESCANSO

OPCIÓN C — DESCANSO:
Prescribe SI:
· HRV POOR
· O TSB < −35
· O los 3 sistemas están estresados alto simultáneamente
· O días consecutivos ≥ 6
· O no hay actividad complementaria disponible y la bici no es óptima
Descanso = caminata suave 20min + sueño extra. No es inactividad total.

══════════════════════════════════════════
PASO 5 — CONECTA CON EL OBJETIVO Y LIMITANTES
══════════════════════════════════════════

La prescripción debe explicar estratégicamente por qué este día sirve al objetivo.
No "descansas porque estás cansado" — sino el motivo estratégico real.

Si hay un limitante en [${s.limiters?.join(", ") || "ninguno"}] que puede trabajarse
mañana sin interferir con la recuperación de los sistemas estresados hoy → inclúyelo.

Ejemplo: si cadencia baja es limitante y mañana prescribes bici suave →
agrega instrucción específica: "mantén cadencia >90rpm conscientemente aunque bajes potencia"

══════════════════════════════════════════
FORMATO — JSON válido, sin texto antes ni después, sin markdown
══════════════════════════════════════════

{
  "opcion": "bici|complementaria|descanso",
  "sistemas_estresados": ["cardiovascular"|"muscular"|"snc"],
  "actividad_nombre": "nombre corto máx 4 palabras",
  "actividad_descripcion": "qué hacer exactamente — duración, intensidad, vatios o FC si aplica, terreno",
  "por_que_fisiologico": "razón basada en sistemas estresados — máx 2 oraciones",
  "por_que_estrategico": "cómo conecta con el objetivo del atleta — máx 1 oración",
  "limitante_trabajado": "instrucción específica si aplica, null si no",
  "alerta": "algo que monitorear mañana si aplica, null si no"
}
`;
}

function promptStructureWorkout(input: StructureWorkoutInput): string {
  const z1hi = Math.round(input.ftp * 0.55);
  const z2lo = Math.round(input.ftp * 0.56), z2hi = Math.round(input.ftp * 0.75);
  const z3lo = Math.round(input.ftp * 0.76), z3hi = Math.round(input.ftp * 0.87);
  const z4lo = Math.round(input.ftp * 0.88), z4hi = Math.round(input.ftp * 0.95);
  const z5lo = Math.round(input.ftp * 1.06), z5hi = Math.round(input.ftp * 1.20);

  return `Eres el coach de Apex. Convierte esta prescripción en un workout estructurado para Garmin.
Responde SOLO con JSON válido. Sin texto adicional, sin markdown.

PRESCRIPCIÓN
Nombre: ${input.workout_name}
Descripción: ${input.actividad_descripcion}
Razón fisiológica: ${input.por_que_fisiologico}

PERFIL DEL ATLETA
FTP: ${input.ftp}W · FC máx: ${input.max_hr}bpm

ZONAS DE REFERENCIA (FTP=${input.ftp}W)
Z1: <${z1hi}W | Z2: ${z2lo}–${z2hi}W | Z3: ${z3lo}–${z3hi}W | Z4: ${z4lo}–${z4hi}W | Z5: ${z5lo}–${z5hi}W

REGLAS DE ESTRUCTURA
· Siempre inicia con warmup (5–15 min según intensidad del bloque principal)
· Siempre termina con cooldown (5–10 min)
· El bloque principal puede ser 1 step continuo O varios intervalos con recovery entre ellos
· Si la prescripción dice "Z1" o "recuperación": 1 step continuo, sin intervalos
· Si dice "intervalos" o "umbral" o "VO2": múltiples steps de interval + recovery
· target_watts_low y target_watts_high: rango de ±10W alrededor del target central
· Si no hay datos de potencia disponibles: usa target_hr_max en su lugar, deja watts null
· duration_min: número decimal permitido (ej. 7.5)

FORMATO DE SALIDA — JSON exacto, sin campos extra:
{
  "workout_name": "nombre corto del workout",
  "description": "1 oración: qué es este workout y por qué",
  "total_duration_min": número,
  "steps": [
    {
      "type": "warmup|interval|recovery|cooldown",
      "label": "texto corto visible al atleta (ej. 'Calentamiento', 'Bloque Z2', 'Recuperación activa')",
      "duration_min": número,
      "target_watts_low": número o null,
      "target_watts_high": número o null,
      "target_hr_max": número o null,
      "notes": "instrucción específica si aplica, cadencia, terreno, etc."
    }
  ]
}`;
}

function promptChat(message: string, actData: ReturnType<typeof loadActivityData> | null, ctx: ReturnType<typeof buildAthleteContext>): [string, keyof typeof MODELS] {
  const modelKey: keyof typeof MODELS = CHAT_ANALYSIS_KEYWORDS.some(kw => message.toLowerCase().includes(kw)) ? "sonnet" : "haiku";
  const gs = (actData?.analysis?.garmin_summary as Record<string,unknown>) ?? {};
  const ds = (actData?.analysis?.derived_summary as Record<string,unknown>) ?? {};
  const fa = (actData?.analysis?.fatigue as Record<string,unknown>) ?? {};
  const ps = actData?.analysis?.performance_scores as Record<string,{score?: number}> ?? {};
  const prompt = `ATLETA
${ctxBlock(ctx)}

ACTIVIDAD ACTUAL (${String(gs.start_date ?? "").slice(0,10)})
${gs.name} | ${gs.distance_km} km | ${gs.elevation_m} m | ${gs.moving_minutes} min
TSS ${gs.garmin_tss} | NP ${gs.garmin_np}W | IF ${gs.garmin_if}
Caída potencia: ${fa.power_drop_pct}% | Active cadence: ${ds.active_cadence_rpm} rpm
Score global: ${ps.overall_score?.score ?? "?"}

MENSAJE DEL ATLETA
${message}

Responde en español. Máximo 150 palabras. Coach que ya lleva meses siguiendo este atleta.
Sin presentaciones. Sin "según tus datos". Sin "como coach". Directo al punto.
Si no tienes el dato: "No tengo ese dato en tu historial aún."`;
  return [prompt, modelKey];
}

// ── handler ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json() as ApexRequest;
  const { call_type, activity_id, message, athlete_data, session_data, state_data } = body;

  if (!call_type) {
    return NextResponse.json({ error: "call_type is required" }, { status: 400 });
  }

  const garminKey = request.cookies.get("apex_garmin_key")?.value ?? "";
  const userDir = garminKey ? getUserDataDir(garminKey) : undefined;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const ctx = buildAthleteContext(userDir);
  const actData = activity_id ? loadActivityData(activity_id, userDir) : null;

  try {
    if (call_type === "verdict") {
      if (!actData?.analysis) return NextResponse.json({ error: "activity not found" }, { status: 404 });
      const resp = await client.messages.create({
        model: MODELS.haiku,
        max_tokens: 300,
        messages: [{ role: "user", content: promptVerdict(actData.analysis, ctx) }],
      });
      return NextResponse.json({ call_type, output: (resp.content[0] as {text: string}).text.trim() });
    }

    if (call_type === "athlete_profile") {
      if (!actData?.analysis) return NextResponse.json({ error: "activity not found" }, { status: 404 });
      const recent = loadRecentAnalyses(activity_id, 5, userDir);
      const resp = await client.messages.create({
        model: MODELS.sonnet,
        max_tokens: 600,
        messages: [{ role: "user", content: promptAthleteProfile(actData.analysis, ctx, recent) }],
      });
      const text = (resp.content[0] as {text: string}).text.trim();
      try { return NextResponse.json({ call_type, output: parseJson(text) }); }
      catch { return NextResponse.json({ call_type, output: text }); }
    }

    if (call_type === "action_plan") {
      if (!actData) return NextResponse.json({ error: "activity not found" }, { status: 404 });
      const resp = await client.messages.create({
        model: MODELS.sonnet,
        max_tokens: 900,
        messages: [{ role: "user", content: promptActionPlan(actData.findings, ctx, actData.analysis ?? {}) }],
      });
      const text = (resp.content[0] as {text: string}).text.trim();
      try { return NextResponse.json({ call_type, output: parseJson(text) }); }
      catch { return NextResponse.json({ call_type, output: text }); }
    }

    if (call_type === "full_report") {
      if (!actData) return NextResponse.json({ error: "activity not found" }, { status: 404 });
      const recent = loadRecentAnalyses(activity_id, 6, userDir);
      const resp = await client.messages.create({
        model: MODELS.opus,
        max_tokens: 3000,
        messages: [{ role: "user", content: promptFullReport(actData, ctx, recent) }],
      });
      return NextResponse.json({ call_type, output: (resp.content[0] as {text: string}).text.trim() });
    }

    if (call_type === "athlete_context") {
      return NextResponse.json({ call_type, output: computeAthleteMetrics(userDir) });
    }

    if (call_type === "weekly_plan") {
      if (!athlete_data || !session_data || !state_data) {
        return NextResponse.json({ error: "athlete_data, session_data and state_data are required" }, { status: 400 });
      }
      const resp = await client.messages.create({
        model: MODELS.sonnet,
        max_tokens: 1200,
        messages: [{ role: "user", content: buildNextDayPrompt(athlete_data, session_data, state_data) }],
      });
      const text = (resp.content[0] as {text: string}).text.trim();
      try { return NextResponse.json({ call_type, output: parseJson(text) }); }
      catch { return NextResponse.json({ call_type, output: text }); }
    }

    if (call_type === "structure_workout") {
      const { structure_workout_input } = body;
      if (!structure_workout_input) {
        return NextResponse.json({ error: "structure_workout_input is required" }, { status: 400 });
      }
      const resp = await client.messages.create({
        model: MODELS.sonnet,
        max_tokens: 900,
        messages: [{ role: "user", content: promptStructureWorkout(structure_workout_input) }],
      });
      const text = (resp.content[0] as {text: string}).text.trim();
      try { return NextResponse.json({ call_type, output: parseJson(text) }); }
      catch { return NextResponse.json({ call_type, output: text }); }
    }

    if (call_type === "chat") {
      if (!message) return NextResponse.json({ error: "message is required for chat" }, { status: 400 });
      const [prompt, modelKey] = promptChat(message, actData, ctx);
      const resp = await client.messages.create({
        model: MODELS[modelKey],
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      });
      return NextResponse.json({
        call_type,
        model_used: modelKey,
        output: (resp.content[0] as {text: string}).text.trim(),
      });
    }

    return NextResponse.json({ error: `Unknown call_type: ${call_type}` }, { status: 400 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
