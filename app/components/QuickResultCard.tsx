"use client";

// Handles both sleep_brief_ai and day_brief_ai structures

interface SleepSystem {
  name: string;
  score: number;
  status: "up" | "down" | "stable" | "warning";
  message: string;
}

interface SleepDeepExtraInsight {
  title: string;
  text: string;
}

interface SleepDeepAnalysis {
  follow_up_priority?: string | null;
  extra_insights?: SleepDeepExtraInsight[];
  chat_starters?: string[];
}

interface SleepBriefAI {
  hero?: { score: number; status: string; headline: string };
  systems?: SleepSystem[];
  today?: { performance: string; action: string };
  pattern?: { message: string };
  deep_analysis?: SleepDeepAnalysis;
}

interface DaySystem {
  score: number;
  message: string;
}

interface DayBriefAI {
  daily_brief?: {
    body_status_now: string;
    main_message: string;
    systems_today?: Record<string, DaySystem>;
    performance_outlook?: string;
    what_to_do_now?: string;
    pattern_detected?: string;
  };
}

function statusDot(status: string): string {
  if (status === "up") return "#22c55e";
  if (status === "stable") return "#3b82f6";
  if (status === "warning") return "#f97316";
  if (status === "down") return "#ef4444";
  return "#888888";
}

function scoreColor(score: number): string {
  if (score >= 7) return "#22c55e";
  if (score >= 5) return "#f97316";
  return "#ef4444";
}

const DAY_SYSTEM_LABELS: Record<string, string> = {
  nervous_system: "Sist. nervioso",
  energy: "Energía",
  physical_load: "Carga física",
  cognitive_load: "Carga mental",
  stress: "Estrés",
  respiratory: "Respiración",
};

function SleepCard({ data, onChatStarter, slim }: { data: SleepBriefAI; onChatStarter?: (text: string) => void; slim?: boolean }) {
  const { hero, systems, today, pattern, deep_analysis } = data;

  const followUp = deep_analysis?.follow_up_priority;
  const extraInsights = deep_analysis?.extra_insights ?? [];
  const chatStarters = (deep_analysis?.chat_starters ?? []).slice(0, 3);

  function handleStarter(text: string) {
    if (onChatStarter) {
      onChatStarter(text);
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── hero ── */}
      {!slim && hero && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white leading-snug">{hero.headline}</p>
            <span
              className="text-2xl font-bold ml-3 shrink-0"
              style={{ color: scoreColor(hero.score / 10) }}
            >
              {hero.score}
            </span>
          </div>
          <p className="text-xs" style={{ color: scoreColor(hero.score / 10) }}>
            {hero.status}
          </p>
        </div>
      )}

      {/* ── systems ── */}
      {!slim && systems && systems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {systems.map((s) => (
            <div key={s.name} className="flex items-start gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: statusDot(s.status) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{s.name}</span>
                  <span className="text-xs" style={{ color: scoreColor(s.score) }}>
                    {s.score}/10
                  </span>
                </div>
                <p className="text-xs text-[#888888] leading-snug">{s.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── today ── */}
      {!slim && today && (
        <div
          className="rounded-lg p-3"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          <p className="text-xs text-[#22c55e] font-semibold mb-1">Qué hacer hoy</p>
          <p className="text-xs text-[#cccccc] leading-relaxed">{today.action}</p>
          {today.performance && (
            <>
              <p className="text-xs text-[#888888] font-semibold mt-2 mb-0.5">Rendimiento esperado</p>
              <p className="text-xs text-[#888888] leading-relaxed">{today.performance}</p>
            </>
          )}
        </div>
      )}

      {/* ── pattern ── */}
      {pattern?.message && (
        <div
          className="rounded-xl"
          style={{ background: "var(--color-background-secondary, #111111)", padding: "12px 14px" }}
        >
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555555", marginBottom: 6 }}>
            ◆ Patrón personal
          </p>
          <p style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.6 }}>
            <span style={{ color: "#555555" }}>◆ </span>{pattern.message}
          </p>
        </div>
      )}

      {/* ── follow_up_priority ── */}
      {followUp && (
        <div
          className="rounded-lg p-3"
          style={{ borderLeft: "3px solid #EF9F27", background: "#1a1a1a" }}
        >
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#EF9F27", marginBottom: 5 }}>
            Seguimiento recomendado
          </p>
          <p style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.5 }}>{followUp}</p>
        </div>
      )}

      {/* ── extra_insights ── */}
      {extraInsights.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555555", marginBottom: 8 }}>
            Insights adicionales
          </p>
          <div className="flex flex-col">
            {extraInsights.map((item, i) => (
              <div
                key={i}
                style={{
                  paddingBottom: i < extraInsights.length - 1 ? 10 : 0,
                  marginBottom: i < extraInsights.length - 1 ? 10 : 0,
                  borderBottom: i < extraInsights.length - 1 ? "0.5px solid var(--color-border-tertiary, #222222)" : "none",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: "#ffffff", marginBottom: 3 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: "#888888", lineHeight: 1.5 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── chat_starters ── */}
      {chatStarters.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555555", marginBottom: 8 }}>
            Pregúntale al coach
          </p>
          <div className="flex flex-col gap-2">
            {chatStarters.map((starter, i) => (
              <button
                key={i}
                onClick={() => handleStarter(starter)}
                style={{
                  background: "transparent",
                  border: "0.5px solid #333333",
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12,
                  color: "#cccccc",
                  cursor: "pointer",
                  textAlign: "left",
                  lineHeight: 1.4,
                }}
              >
                {starter.length > 52 ? starter.slice(0, 52) + "..." : starter}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({ data }: { data: DayBriefAI }) {
  const brief = data.daily_brief;
  if (!brief) return null;

  const systems = brief.systems_today
    ? Object.entries(brief.systems_today)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: "#f97316" }}>
          {brief.body_status_now}
        </p>
        <p className="text-sm text-white leading-relaxed">{brief.main_message}</p>
      </div>

      {systems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {systems.map(([key, sys]) => (
            <div key={key} className="flex items-start gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: scoreColor(sys.score) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">
                    {DAY_SYSTEM_LABELS[key] ?? key}
                  </span>
                  <span className="text-xs" style={{ color: scoreColor(sys.score) }}>
                    {sys.score}/10
                  </span>
                </div>
                <p className="text-xs text-[#888888] leading-snug">{sys.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {brief.what_to_do_now && (
        <div
          className="rounded-lg p-3"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          <p className="text-xs text-[#22c55e] font-semibold mb-1">Qué hacer ahora</p>
          <p className="text-xs text-[#cccccc] leading-relaxed">{brief.what_to_do_now}</p>
        </div>
      )}

      {brief.performance_outlook && (
        <p className="text-xs text-[#888888] leading-relaxed">
          <span className="text-[#888888] font-semibold">Outlook: </span>
          {brief.performance_outlook}
        </p>
      )}
    </div>
  );
}

// ── Activity card (new schema v2) ────────────────────────────────────────

interface ActivityHighlight {
  titulo: string;
  valor: string;
  contexto: string;
  delta: string | null;
  sentimiento: "positivo" | "neutro" | "negativo";
  detalle: string;
}

interface ActivityQuickBrief {
  headline: string;
  score: number;
  score_label: string;
  highlights: ActivityHighlight[];
  veredicto: string;
  recomendacion_tecnica: string;
  recomendacion_entrenamiento: string;
}

interface ThreeDayPlanDay {
  dia: string;
  tipo: string;
  descripcion: string;
  duracion: string;
  intensidad: string;
  metricas_objetivo: string;
  si_te_sientes_mal?: string;
}

interface ThreeDayPlan {
  contexto: string;
  dias: ThreeDayPlanDay[];
}

function sentimentColor(s: string): string {
  if (s === "positivo") return "#1D9E75";
  if (s === "negativo") return "#E24B4A";
  return "#888888";
}

function sentimentIcon(s: string): string {
  if (s === "positivo") return "↑";
  if (s === "negativo") return "↓";
  return "→";
}

function ActivityCard({ qb, tdp }: { qb: ActivityQuickBrief; tdp?: ThreeDayPlan }) {
  const scoreColor = qb.score >= 70 ? "#1D9E75" : qb.score >= 50 ? "#EF9F27" : "#E24B4A";

  return (
    <div className="flex flex-col gap-4">

      {/* Headline + score */}
      <div className="flex items-start gap-3">
        <div className="text-center shrink-0">
          <p className="text-3xl font-black leading-none" style={{ color: scoreColor }}>{qb.score}</p>
          <p className="text-[9px] text-[#555555] mt-0.5">/100</p>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white leading-snug mb-1">{qb.headline}</p>
          <p className="text-[11px]" style={{ color: scoreColor }}>{qb.score_label}</p>
        </div>
      </div>

      {/* 5 insight cards */}
      {qb.highlights && qb.highlights.length > 0 && (
        <div className="flex flex-col gap-2">
          {qb.highlights.map((h, i) => (
            <div
              key={i}
              className="rounded-lg p-3"
              style={{
                background: "#161616",
                border: `1px solid ${sentimentColor(h.sentimiento)}22`,
                borderLeft: `3px solid ${sentimentColor(h.sentimiento)}`,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  {h.titulo}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {h.delta && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                      background: `${sentimentColor(h.sentimiento)}15`,
                      color: sentimentColor(h.sentimiento),
                    }}>
                      {sentimentIcon(h.sentimiento)} {h.delta}
                    </span>
                  )}
                  <span className="text-sm font-black text-white">{h.valor}</span>
                </div>
              </div>
              <p className="text-[10px] text-[#888888] mb-1">{h.contexto}</p>
              <p className="text-[11px] text-[#cccccc] leading-snug">{h.detalle}</p>
            </div>
          ))}
        </div>
      )}

      {/* Veredicto */}
      <div className="rounded-lg px-3 py-2.5" style={{ background: "#1a1a1a", borderLeft: "3px solid #EF9F27" }}>
        <p className="text-[10px] text-[#EF9F27] font-semibold uppercase tracking-wider mb-1">Veredicto</p>
        <p className="text-xs text-white leading-relaxed">{qb.veredicto}</p>
      </div>

      {/* Recomendaciones */}
      <div className="flex flex-col gap-2">
        {qb.recomendacion_tecnica && (
          <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
            <p className="text-[10px] text-[#1D9E75] font-semibold uppercase tracking-wider mb-1">Para mejorar</p>
            <p className="text-xs text-[#cccccc] leading-relaxed">{qb.recomendacion_tecnica}</p>
          </div>
        )}
        {qb.recomendacion_entrenamiento && (
          <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
            <p className="text-[10px] text-[#3b82f6] font-semibold uppercase tracking-wider mb-1">Próxima sesión</p>
            <p className="text-xs text-[#cccccc] leading-relaxed">{qb.recomendacion_entrenamiento}</p>
          </div>
        )}
      </div>

      {/* Plan 3 días */}
      {tdp && tdp.dias && tdp.dias.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-2">Plan 3 días</p>
          {tdp.contexto && (
            <p className="text-[10px] text-[#444444] mb-3 leading-relaxed">{tdp.contexto}</p>
          )}
          <div className="flex flex-col gap-2">
            {tdp.dias.map((d, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: "#161616", border: "1px solid #1e1e1e" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{d.dia}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#1a1a1a", color: "#666666" }}>
                      {d.duracion}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(29,158,117,0.12)", color: "#1D9E75" }}>
                      {d.intensidad}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#EF9F27] font-semibold mb-1">{d.tipo}</p>
                <p className="text-[11px] text-[#aaaaaa] leading-snug mb-1">{d.descripcion}</p>
                {d.metricas_objetivo && (
                  <p className="text-[10px] text-[#555555]">Objetivo: {d.metricas_objetivo}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuickResultCard({ data, onChatStarter, slim }: { data: Record<string, unknown>; onChatStarter?: (text: string) => void; slim?: boolean }) {
  const isSleep = "hero" in data || ("systems" in data && Array.isArray(data.systems));
  const isDay = "daily_brief" in data;
  const isActivity = "quick_brief" in data && data.quick_brief != null;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#111111", border: "1px solid #1D9E7533" }}
    >
      <p className="text-[10px] text-[#1D9E75] mb-3 font-semibold uppercase tracking-wider">
        ⚡ Análisis Rápido IA
      </p>

      {isSleep && <SleepCard data={data as unknown as SleepBriefAI} onChatStarter={onChatStarter} slim={slim} />}
      {isDay && <DayCard data={data as unknown as DayBriefAI} />}
      {isActivity && (
        <ActivityCard
          qb={data.quick_brief as ActivityQuickBrief}
          tdp={data.three_day_plan as ThreeDayPlan | undefined}
        />
      )}
      {!isSleep && !isDay && !isActivity && "phase_1_quick_insight" in data && (
        (() => {
          const p1 = data.phase_1_quick_insight as Record<string, unknown> | undefined;
          if (!p1) return null;
          const overall = p1.overall_score as Record<string, unknown> | undefined;
          return (
            <div className="flex flex-col gap-3">
              {!!p1.headline && <p className="text-sm font-semibold text-white">{String(p1.headline)}</p>}
              {!!overall && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black" style={{ color: "#EF9F27" }}>{String(overall.score)}</span>
                  <span className="text-xs text-[#888888]">/100 — {String(overall.label ?? "")}</span>
                </div>
              )}
              {!!p1.verdict && <p className="text-xs text-[#cccccc] leading-relaxed">{String(p1.verdict)}</p>}
              {!!p1.next_decision && (
                <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
                  <p className="text-[10px] text-[#1D9E75] font-semibold uppercase tracking-wider mb-1">Qué hacer</p>
                  <p className="text-xs text-[#cccccc]">{String(p1.next_decision)}</p>
                </div>
              )}
              <p className="text-[9px] text-[#333333]">Regenera el análisis para ver el nuevo formato con comparativas e insights.</p>
            </div>
          );
        })()
      )}
      {!isSleep && !isDay && !isActivity && !("phase_1_quick_insight" in data) && (
        <pre className="text-xs text-[#888888] whitespace-pre-wrap overflow-auto max-h-60">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
