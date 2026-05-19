"use client";

import { useState, useRef, useEffect } from "react";

// ── types ─────────────────────────────────────────────────────────────────────

interface AthleteProfile {
  primary_type: string;
  strengths: string[];
  limiters: string[];
  development_focus: string[];
}

interface ActionItem {
  priority: number;
  action: string;
  why: string;
  how: string;
}

interface ChatMessage {
  role: "user" | "coach";
  text: string;
  model?: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function stripAndParse(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return val;
  const clean = val.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try { return JSON.parse(clean); } catch { return null; }
}

// ── shared API helper ──────────────────────────────────────────────────────────

async function callApex(body: Record<string, unknown>) {
  const res = await fetch("/api/ai/apex", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ output?: unknown; model_used?: string; error?: string }>;
}

// ── model badge ────────────────────────────────────────────────────────────────

function ModelBadge({ model }: { model: "haiku" | "sonnet" | "opus" }) {
  const cfg = {
    haiku:  { bg: "#E8F4E8", color: "#1D6B3A", label: "Haiku" },
    sonnet: { bg: "#FAC775", color: "#633806", label: "Sonnet" },
    opus:   { bg: "#F5C4B3", color: "#712B13", label: "Opus" },
  }[model];
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ── Verdict Widget ─────────────────────────────────────────────────────────────
// Place in Level 1, above KPIs

export function VerdictWidget({ activityId }: { activityId: string }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const data = await callApex({ call_type: "verdict", activity_id: activityId });
    if (data.error) setError(data.error);
    else setVerdict(data.output as string);
    setLoading(false);
  }

  useEffect(() => { generate(); }, [activityId]);

  if (loading && !verdict) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="inline-block w-3 h-3 border border-[#1D9E75] border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-[12px] text-[#444444]">Generando veredicto...</span>
      </div>
    );
  }

  if (!verdict) {
    return error ? <p className="text-[11px] text-[#E24B4A]">{error}</p> : null;
  }

  // Split on sentence boundaries: period/!? NOT preceded by a digit (avoids splitting on decimals like 0.96)
  const parts = verdict.split(/(?<!\d)[.!?]\s+(?=[A-ZÁÉÍÓÚÑ])/);
  const first = parts[0]?.trim() ?? "";
  const rest = parts.slice(1).join(". ").trim();

  return (
    <div>
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1D9E75" }}>Veredicto</p>
        <button
          onClick={generate}
          disabled={loading}
          className="text-[11px] px-2 py-0.5 disabled:opacity-40 transition-all"
          style={{ border: "0.5px solid #444444", borderRadius: 20, color: "#666666" }}
        >
          {loading ? "..." : "↻ actualizar"}
        </button>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "#aaaaaa" }}>{first}</p>
      {rest && <p style={{ fontSize: 14, lineHeight: 1.6, color: "#aaaaaa", marginTop: 2 }}>{rest}</p>}
      {error && <p className="text-[11px] text-[#E24B4A] mt-1">{error}</p>}
    </div>
  );
}

// ── Profile Widget ─────────────────────────────────────────────────────────────
// Place at end of Level 3

const TYPE_LABELS: Record<string, string> = {
  puncher: "Puncheur", climber: "Escalador", diesel: "Diesel", "all-rounder": "All-Rounder",
};
const TYPE_COLORS: Record<string, string> = {
  puncher: "#EF9F27", climber: "#1D9E75", diesel: "#3b82f6", "all-rounder": "#a855f7",
};

export function ProfileWidget({ activityId }: { activityId: string }) {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const data = await callApex({ call_type: "athlete_profile", activity_id: activityId });
    if (data.error) { setError(data.error); }
    else {
      const parsed = stripAndParse(data.output);
      setProfile((parsed && typeof parsed === "object" ? parsed : null) as AthleteProfile | null);
    }
    setLoading(false);
  }

  if (!profile) {
    return (
      <div>
        <button
          onClick={generate}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
          style={{ border: "0.5px solid #333333", color: "#888888", background: "transparent" }}
        >
          {loading ? (
            <>
              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              Generando con Sonnet...
            </>
          ) : (
            <>
              <ModelBadge model="sonnet" />
              Actualizar perfil
            </>
          )}
        </button>
        {error && <p className="text-[11px] text-[#E24B4A] mt-1">{error}</p>}
      </div>
    );
  }

  const color = TYPE_COLORS[profile.primary_type] ?? "#888888";
  return (
    <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555]">Perfil del atleta — IA</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${color}20`, color }}>
            {TYPE_LABELS[profile.primary_type] ?? profile.primary_type}
          </span>
          <button
            onClick={generate}
            disabled={loading}
            className="text-[10px] px-2 py-0.5 rounded-full disabled:opacity-40"
            style={{ border: "0.5px solid #a855f7", color: "#a855f7" }}
          >
            {loading ? "..." : "↻"}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {profile.strengths?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1D9E75" }}>Fortalezas</p>
            {profile.strengths.map((s, i) => <p key={i} className="text-xs text-[#aaaaaa] mb-0.5">· {s}</p>)}
          </div>
        )}
        {profile.limiters?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#E24B4A" }}>Limitantes</p>
            {profile.limiters.map((s, i) => <p key={i} className="text-xs text-[#aaaaaa] mb-0.5">· {s}</p>)}
          </div>
        )}
        {profile.development_focus?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#EF9F27" }}>Foco de desarrollo</p>
            {profile.development_focus.map((s, i) => <p key={i} className="text-xs text-[#aaaaaa] mb-0.5">· {s}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Level 4 AI Section ─────────────────────────────────────────────────────────
// Plan semanal + Reporte completo

export function Level4AI({ activityId }: { activityId: string }) {
  const [actionPlan, setActionPlan]     = useState<ActionItem[] | null>(null);
  const [fullReport, setFullReport]     = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan]   = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [errorPlan, setErrorPlan]       = useState<string | null>(null);
  const [errorReport, setErrorReport]   = useState<string | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);

  async function generatePlan() {
    setLoadingPlan(true);
    setErrorPlan(null);
    const data = await callApex({ call_type: "action_plan", activity_id: activityId });
    setLoadingPlan(false);
    if (data.error) { setErrorPlan(data.error); return; }
    let out = stripAndParse(data.output);
    if (!Array.isArray(out) && out && typeof out === "object") {
      const nested = Object.values(out as Record<string, unknown>).find(v => Array.isArray(v));
      if (nested) out = nested;
    }
    setActionPlan(Array.isArray(out) ? (out as ActionItem[]) : null);
  }

  async function generateReport() {
    setLoadingReport(true);
    setErrorReport(null);
    const data = await callApex({ call_type: "full_report", activity_id: activityId });
    setLoadingReport(false);
    if (data.error) { setErrorReport(data.error); return; }
    setFullReport(data.output as string);
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Plan semanal ─────────────────────────────── */}
      {!actionPlan ? (
        <div>
          <button
            onClick={generatePlan}
            disabled={loadingPlan || loadingReport}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] transition-all disabled:opacity-50"
            style={{ height: 52, border: "1px solid #EF9F27", color: "#EF9F27", background: "transparent", fontSize: 14, fontWeight: 500 }}
          >
            {loadingPlan ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                Generando con Sonnet...
              </>
            ) : (
              <>
                <ModelBadge model="sonnet" />
                ⚡ Generar plan semanal
              </>
            )}
          </button>
          {errorPlan && <p className="text-[11px] text-[#E24B4A] mt-1">{errorPlan}</p>}
        </div>
      ) : (
        <div>
          <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-4">Plan de acción — esta semana</p>
            <div className="flex flex-col gap-3">
              {actionPlan.map((a) => (
                <div
                  key={a.priority}
                  className="rounded-lg p-3"
                  style={{
                    background: "#1a1a1a",
                    borderLeft: `3px solid ${a.priority === 1 ? "#1D9E75" : a.priority === 2 ? "#EF9F27" : "#555555"}`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <span
                      className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: a.priority === 1 ? "#1D9E75" : a.priority === 2 ? "#EF9F27" : "#333333", color: "#000" }}
                    >
                      {a.priority}
                    </span>
                    <p className="text-xs font-semibold text-white leading-snug">{a.action}</p>
                  </div>
                  <p className="text-[10px] text-[#888888] leading-snug ml-7 mb-1">
                    <span className="text-[#555555]">Por qué: </span>{a.why}
                  </p>
                  <p className="text-[10px] leading-snug ml-7" style={{ color: "#1D9E75" }}>{a.how}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={generatePlan}
            disabled={loadingPlan}
            className="mt-2 text-[10px] px-3 py-1 rounded-full disabled:opacity-40"
            style={{ border: "0.5px solid #EF9F27", color: "#EF9F27" }}
          >
            {loadingPlan ? "..." : "↻ regenerar plan"}
          </button>
        </div>
      )}

      {/* ── Reporte completo ──────────────────────────── */}
      {!fullReport ? (
        <div>
          <button
            onClick={generateReport}
            disabled={loadingReport || loadingPlan}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] transition-all disabled:opacity-50"
            style={{ height: 52, border: "1px solid #a855f7", color: "#a855f7", background: "transparent", fontSize: 14, fontWeight: 500 }}
          >
            {loadingReport ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                Analizando con Opus...
              </>
            ) : (
              <>
                <ModelBadge model="opus" />
                Generar reporte completo
              </>
            )}
          </button>
          {errorReport && <p className="text-[11px] text-[#E24B4A] mt-1">{errorReport}</p>}
        </div>
      ) : (
        <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555555]">Reporte completo</p>
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "#2a1a00", color: "#EF9F27" }}>Opus</span>
          </div>
          <div className="text-xs text-[#cccccc] leading-relaxed whitespace-pre-wrap">
            {reportExpanded ? fullReport : fullReport.split("\n").slice(0, 8).join("\n")}
          </div>
          <button
            onClick={() => setReportExpanded(v => !v)}
            className="mt-3 text-[11px] font-semibold"
            style={{ color: "#1D9E75" }}
          >
            {reportExpanded ? "↑ Mostrar menos" : "↓ Ver reporte completo"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Floating Chat ──────────────────────────────────────────────────────────────

export function FloatingChat({ activityId }: { activityId: string }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(h => [...h, { role: "user", text: msg }]);
    setLoading(true);
    setError(null);
    const data = await callApex({ call_type: "chat", activity_id: activityId, message: msg });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setMessages(h => [...h, { role: "coach", text: data.output as string ?? "", model: data.model_used }]);
  }

  const coachCount = messages.filter(m => m.role === "coach").length;

  return (
    <>
      {/* ── Floating button ────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-transform active:scale-95"
        style={{
          background: "#1D9E75",
          boxShadow: "0 4px 20px rgba(29,158,117,0.45)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {coachCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "#EF9F27", color: "#000" }}
          >
            {coachCount}
          </span>
        )}
      </button>

      {/* ── Slide-up panel ─────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl flex flex-col"
            style={{ height: "65vh", background: "#111111", borderTop: "1px solid #1e1e1e" }}
          >
            {/* Drag handle + header */}
            <div className="flex flex-col items-center pt-3 pb-2 px-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <div className="w-10 h-1 rounded-full mb-3" style={{ background: "#333333" }} />
              <div className="flex items-center justify-between w-full">
                <p className="text-[13px] font-semibold text-white">Coach Apex</p>
                <button onClick={() => setOpen(false)} className="text-[#555555] text-xl leading-none px-1">×</button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <p className="text-xs text-[#444444] text-center mt-10">
                  Pregúntame sobre esta actividad
                </p>
              )}
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
                    <div
                      className="max-w-[85%] rounded-xl px-3 py-2"
                      style={{
                        background: isUser ? "#1D9E7520" : "#1a1a1a",
                        border: `1px solid ${isUser ? "#1D9E7540" : "#222222"}`,
                      }}
                    >
                      {!isUser && m.model && (
                        <p className="text-[8px] text-[#444444] mb-1 uppercase tracking-wider">{m.model}</p>
                      )}
                      <p className="text-xs text-[#cccccc] leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start mb-2">
                  <div className="rounded-xl px-3 py-2.5" style={{ background: "#1a1a1a", border: "1px solid #222222" }}>
                    <span className="inline-block w-3 h-3 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-[#E24B4A] mt-1">{error}</p>}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-5 pt-2" style={{ borderTop: "1px solid #1a1a1a" }}>
              <div className="flex gap-2 items-center">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Pregúntale al coach..."
                  disabled={loading}
                  className="flex-1 rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#444444] outline-none disabled:opacity-50"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                  autoFocus
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: "#1D9E75" }}
                >
                  <span className="text-black font-bold text-base leading-none">↑</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
