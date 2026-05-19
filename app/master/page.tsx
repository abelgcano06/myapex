"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ScoreRing } from "../components/ScoreRing";
import { AIButtons } from "../components/AIButtons";
import { DeepAnalysisModal } from "../components/DeepAnalysisModal";
import { TrendChart } from "../components/TrendChart";
import { C } from "@/app/lib/apex-tokens";

interface ContributingScores {
  sleep_overall_recovery: number;
  sleep_physical: number;
  sleep_neural: number;
  sleep_autonomic_curve: number;
  day_overall_state: number;
  day_recovery_response: number;
  day_energy_dynamics: number;
}

interface Correlation {
  name: string;
  pearson_r: number | null;
  n_pairs: number;
  interpretation: string;
  what_it_says: string;
}

interface MasterBrief {
  calendar_date: string;
  readiness_score: number;
  readiness_label: string;
  primary_limiter: string;
  secondary_limiter: string;
  recommendation: string;
  activity_projection: string;
  penalty_notes: string[];
  contributing_scores: ContributingScores;
  risk_flags: Record<string, boolean>;
  dynamic_weights: {
    sleep_weight: number;
    day_weight: number;
    interpretation: string;
  };
  strong_personal_correlations: { name: string; r: number; what_it_says: string }[];
}

interface ReadinessHistoryRow {
  calendar_date: string;
  readiness_score: number;
  sleep_score: number;
  day_score: number;
  has_activity: boolean;
  penalty_total: number;
}

interface MasterData {
  master: MasterBrief | null;
  history_30: ReadinessHistoryRow[];
  correlations: { record_count: number; correlations: Correlation[] } | null;
  dynamic_weights: { sleep_weight: number; day_weight: number; sleep_avg_r: number; day_avg_r: number; interpretation: string } | null;
}

interface DeepContent {
  headline: string;
  tipo_de_dia: string;
  insight_principal: string;
  que_esta_pasando: string;
  que_significa_para_ti: string;
  impacto_rendimiento: string;
  recomendacion: string;
  key_takeaways: string[];
}

function sc(score: number | null): string {
  if (score === null) return C.muted;
  if (score >= 70) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

function scBg(score: number | null): string {
  if (score === null) return C.bg;
  if (score >= 70) return C.greenBg;
  if (score >= 50) return C.amberBg;
  return C.redBg;
}

function labelEs(key: string): string {
  const map: Record<string, string> = {
    sleep_overall_recovery: "Recuperación sueño",
    sleep_physical: "Físico nocturno",
    sleep_neural: "Neural nocturno",
    sleep_autonomic_curve: "Autonómico",
    day_overall_state: "Estado del día",
    day_recovery_response: "Respuesta recup.",
    day_energy_dynamics: "Energía del día",
  };
  return map[key] ?? key.replace(/_/g, " ");
}

function readinessLabelEs(label: string): string {
  const map: Record<string, string> = {
    optimo: "Óptimo",
    buena_forma: "Buena forma",
    precaucion_carga_reducida: "Precaución",
    recuperacion_activa: "Recuperación activa",
    descanso: "Descanso",
  };
  return map[label] ?? label.replace(/_/g, " ");
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight?: number }) {
  const color = sc(score);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.secondary }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {weight !== undefined && (
            <span style={{ fontSize: 10, color: C.muted }}>{Math.round(weight * 100)}%</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(score)}</span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.border }}>
        <div style={{ height: 6, borderRadius: 3, width: `${Math.min(score, 100)}%`, background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.purple }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

export default function MasterPage() {
  const [data, setData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deepResult, setDeepResult] = useState<DeepContent | null>(null);

  useEffect(() => {
    fetch("/api/master")
      .then((r) => r.json())
      .then((d: MasterData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const master = data?.master ?? null;
  const history = data?.history_30 ?? [];
  const corrs = data?.correlations;
  const weights = data?.dynamic_weights;
  const recordCount = corrs?.record_count ?? 0;

  const activeRiskFlags = master?.risk_flags
    ? Object.entries(master.risk_flags).filter(([, v]) => v)
    : [];

  const significantCorrs = (corrs?.correlations ?? [])
    .filter((c) => c.pearson_r !== null && Math.abs(c.pearson_r) >= 0.4)
    .sort((a, b) => Math.abs(b.pearson_r!) - Math.abs(a.pearson_r!));

  const buildingCorrs = (corrs?.correlations ?? [])
    .filter((c) => c.pearson_r === null)
    .slice(0, 3);

  const readinessTrend = history.map((h) => ({ date: h.calendar_date, value: h.readiness_score }));
  const sleepTrend = history.map((h) => ({ date: h.calendar_date, value: h.sleep_score }));
  const dayTrend = history.map((h) => ({ date: h.calendar_date, value: h.day_score }));

  const cs = master?.contributing_scores;

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div className="max-w-md mx-auto px-4 py-6 pb-8">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Link href="/" style={{ color: C.muted, textDecoration: "none", fontSize: 20, lineHeight: 1 }}>←</Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.3px" }}>
              Master Intelligence
            </h1>
            {recordCount > 0 && (
              <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>
                Modelo construido con {recordCount} días de tu fisiología
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
            <p style={{ color: C.muted, fontSize: 14 }}>Cargando...</p>
          </div>
        ) : (
          <>
            {/* Readiness score hero */}
            <div style={{
              background: master ? scBg(master.readiness_score) : C.card,
              borderRadius: 20,
              padding: 24,
              marginBottom: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              border: master ? `1px solid ${sc(master.readiness_score)}33` : `1px solid ${C.border}`,
              boxShadow: C.shadow,
            }}>
              <ScoreRing score={master?.readiness_score ?? null} label="Readiness" size="lg" />
              {master?.readiness_label && (
                <div style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
                  background: sc(master.readiness_score) + "22",
                  color: sc(master.readiness_score),
                  border: `1px solid ${sc(master.readiness_score)}44`,
                }}>
                  {readinessLabelEs(master.readiness_label)}
                </div>
              )}
              {master?.penalty_notes && master.penalty_notes.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {master.penalty_notes.map((note, i) => (
                    <span key={i} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: C.redBg, color: C.red, border: `1px solid ${C.red}33`,
                    }}>
                      ↓ {note}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic weights */}
            {weights && (
              <div style={{
                background: C.purpleLight,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                border: `1px solid ${C.purple}22`,
                boxShadow: C.shadow,
              }}>
                <SectionTitle>Tu modelo de rendimiento personal</SectionTitle>
                <p style={{ fontSize: 12, color: C.secondary, marginBottom: 16, lineHeight: 1.6 }}>
                  {weights.interpretation}
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { label: "Sueño", weight: weights.sleep_weight, r: weights.sleep_avg_r },
                    { label: "Día", weight: weights.day_weight, r: weights.day_avg_r },
                  ].map((item) => (
                    <div key={item.label} style={{
                      flex: 1, background: C.card, borderRadius: 12, padding: 12, textAlign: "center",
                      border: `1px solid ${C.border}`, boxShadow: C.shadow,
                    }}>
                      <p style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{item.label}</p>
                      <p style={{ fontSize: 26, fontWeight: 800, color: C.purple, margin: "0 0 4px" }}>
                        {Math.round(item.weight * 100)}%
                      </p>
                      <p style={{ fontSize: 10, color: C.muted }}>r̄ = {item.r.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contributing scores breakdown */}
            {cs && (
              <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                <SectionTitle>Desglose del readiness</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 700 }}>Sueño</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(["sleep_overall_recovery", "sleep_physical", "sleep_neural", "sleep_autonomic_curve"] as const).map((k) =>
                        cs[k] != null ? (
                          <ScoreBar key={k} label={labelEs(k)} score={cs[k]} weight={k === "sleep_overall_recovery" ? weights?.sleep_weight : undefined} />
                        ) : null
                      )}
                    </div>
                  </div>
                  <div style={{ height: 1, background: C.border }} />
                  <div>
                    <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 700 }}>Día</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(["day_overall_state", "day_recovery_response", "day_energy_dynamics"] as const).map((k) =>
                        cs[k] != null ? (
                          <ScoreBar key={k} label={labelEs(k)} score={cs[k]} weight={k === "day_overall_state" ? weights?.day_weight : undefined} />
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Limiters + Recommendation */}
            {master && (
              <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                <SectionTitle>Limitantes hoy</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {master.primary_limiter && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                        background: C.redBg, color: C.red,
                      }}>#1</span>
                      <span style={{ fontSize: 14, color: C.text, textTransform: "capitalize" }}>
                        {master.primary_limiter.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  {master.secondary_limiter && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                        background: C.amberBg, color: C.amber,
                      }}>#2</span>
                      <span style={{ fontSize: 14, color: C.secondary, textTransform: "capitalize" }}>
                        {master.secondary_limiter.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ background: C.bg, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>Recomendación</p>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>{master.recommendation}</p>
                </div>
                {master.activity_projection && (
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 12, lineHeight: 1.6 }}>
                    <span style={{ color: C.secondary, fontWeight: 600 }}>Proyección actividad: </span>
                    {master.activity_projection}
                  </p>
                )}
              </div>
            )}

            {/* Risk flags */}
            {activeRiskFlags.length > 0 && (
              <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                <SectionTitle>Alertas activas</SectionTitle>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {activeRiskFlags.map(([key]) => (
                    <span key={key} style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: C.redBg, color: C.red, border: `1px solid ${C.red}44`,
                    }}>
                      ⚠ {key.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Personal correlations */}
            {(significantCorrs.length > 0 || buildingCorrs.length > 0) && (
              <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                <SectionTitle>Correlaciones de tu fisiología</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {significantCorrs.map((c, i) => {
                    const r = c.pearson_r!;
                    const abs = Math.abs(r);
                    const strength = abs >= 0.7 ? "Fuerte" : abs >= 0.5 ? "Moderada" : "Débil";
                    const dir = r > 0 ? "positiva" : "negativa";
                    const rColor = abs >= 0.6 ? C.green : C.amber;
                    const rBg = abs >= 0.6 ? C.greenBg : C.amberBg;
                    return (
                      <div key={i} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>
                            {c.name.replace(/_/g, " ")}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                            color: rColor, background: rBg,
                          }}>
                            r={r.toFixed(2)} · {strength} {dir}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5, margin: "0 0 4px" }}>{c.what_it_says}</p>
                        <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{c.n_pairs} observaciones</p>
                      </div>
                    );
                  })}
                  {buildingCorrs.map((c, i) => (
                    <div key={`b${i}`} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.muted, textTransform: "capitalize" }}>{c.name.replace(/_/g, " ")}</span>
                        <span style={{ fontSize: 10, color: C.muted, padding: "2px 8px", borderRadius: 20, background: C.border }}>
                          Construyendo...
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>{c.what_it_says}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trends */}
            {history.length >= 5 && (
              <div style={{ marginBottom: 12 }}>
                <SectionTitle>Tendencias 30 días</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <TrendChart title="Readiness" data={readinessTrend} domain={[0, 100]} unit="/100" referenceValue={65} />
                  <TrendChart title="Score sueño" data={sleepTrend} domain={[0, 100]} unit="/100" referenceValue={65} />
                  <TrendChart title="Score día" data={dayTrend} domain={[0, 100]} unit="/100" referenceValue={60} />
                </div>
              </div>
            )}

            {/* AI */}
            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
              <AIButtons
                section="master"
                onDeepResult={(d) => {
                  const content = d.content as DeepContent | undefined;
                  if (content) setDeepResult(content);
                }}
              />
            </div>
          </>
        )}
      </div>

      {deepResult && (
        <DeepAnalysisModal content={deepResult} onClose={() => setDeepResult(null)} />
      )}
    </div>
  );
}
