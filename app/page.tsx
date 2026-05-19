import Link from "next/link";
import { HistoryBars } from "./components/HistoryBars";
import { SessionGuard } from "./components/SessionGuard";
import { SyncButton } from "./components/SyncButton";
import { C } from "@/app/lib/apex-tokens";

interface HomeData {
  master: {
    readiness_score: number;
    readiness_label: string;
    recommendation: string;
    risk_flags: Record<string, boolean>;
    calendar_date: string;
  } | null;
  today_readiness: Record<string, unknown> | null;
  history_7: Array<{ calendar_date: string; readiness_score: number }>;
  sleep_score: number | null;
  day_score: number | null;
  activity: {
    name: string;
    score: number | null;
    date: string;
    type: string;
  } | null;
}

async function getHomeData(): Promise<HomeData> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const res = await fetch(`${baseUrl}/api/home`, { cache: "no-store" });
    return res.json();
  } catch {
    return {
      master: null,
      today_readiness: null,
      history_7: [],
      sleep_score: null,
      day_score: null,
      activity: null,
    };
  }
}

function scoreColor(score: number | null): string {
  if (score === null) return C.muted;
  if (score >= 70) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

function scoreBg(score: number | null): string {
  if (score === null) return C.card;
  if (score >= 70) return C.greenBg;
  if (score >= 50) return C.amberBg;
  return C.redBg;
}

function getScoreLabel(score: number | null): string {
  if (score === null) return "Sin datos";
  if (score >= 70) return "Óptimo";
  if (score >= 50) return "Precaución";
  return "Bajo";
}

function formatLabel(label: string | null | undefined): string {
  if (!label) return "";
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(): string {
  const now = new Date();
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}

export default async function HomePage() {
  const data = await getHomeData();

  const readinessScore = data.master?.readiness_score ?? null;
  const sleepScore = data.sleep_score;
  const dayScore = data.day_score;
  const activityScore = data.activity?.score ?? null;

  const historyBars = data.history_7.map((h) => ({
    date: h.calendar_date,
    score: h.readiness_score ?? null,
  }));

  const scoreCards = [
    { label: "Readiness", score: readinessScore, sublabel: formatLabel(data.master?.readiness_label), href: "/master" },
    { label: "Sueño", score: sleepScore, sublabel: getScoreLabel(sleepScore), href: "/sleep" },
    { label: "Día", score: dayScore, sublabel: getScoreLabel(dayScore), href: "/day" },
    {
      label: "Actividad",
      score: activityScore,
      sublabel: data.activity?.name
        ? data.activity.name.length > 18 ? data.activity.name.substring(0, 18) + "…" : data.activity.name
        : getScoreLabel(activityScore),
      href: "/activity",
    },
  ];

  const navButtons = [
    { label: "Sueño", emoji: "🌙", href: "/sleep" },
    { label: "Día", emoji: "☀️", href: "/day" },
    { label: "Actividad", emoji: "🚴", href: "/activity" },
    { label: "Master", emoji: "⚡", href: "/master" },
    { label: "Perfil", emoji: "👤", href: "/profile" },
  ];

  return (
    <SessionGuard>
      <div style={{ background: C.bg, minHeight: "100vh" }}>
        <div className="max-w-md mx-auto px-4 py-6 pb-36">

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2 }}>
                My Apex
              </h1>
              <span style={{ fontSize: 12, color: C.muted }}>{formatDate()}</span>
            </div>
            <SyncButton />
          </div>

          {/* 4 Score Cards 2x2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {scoreCards.map((card) => (
              <Link key={card.label} href={card.href} style={{ textDecoration: "none" }}>
                <div style={{
                  background: scoreBg(card.score),
                  borderRadius: 16,
                  padding: "14px 16px",
                  border: `1px solid ${scoreColor(card.score)}33`,
                  transition: "opacity 0.15s",
                }}>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{card.label}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: scoreColor(card.score), lineHeight: 1 }}>
                      {card.score !== null ? Math.round(card.score) : "—"}
                    </span>
                    <span style={{ fontSize: 11, color: C.muted }}>/100</span>
                  </div>
                  <p style={{ fontSize: 11, marginTop: 6, color: scoreColor(card.score), fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.sublabel}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recommendation */}
          {data.master?.recommendation && (
            <div style={{
              background: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
              border: `1px solid ${C.border}`, boxShadow: C.shadow,
            }}>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recomendación
              </p>
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: 0 }}>
                {data.master.recommendation}
              </p>
            </div>
          )}

          {/* History Bars */}
          <div style={{
            background: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
            border: `1px solid ${C.border}`, boxShadow: C.shadow,
          }}>
            <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Readiness — últimos 7 días
            </p>
            {historyBars.length > 0 ? (
              <HistoryBars data={historyBars} />
            ) : (
              <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "16px 0" }}>
                Sin datos históricos
              </p>
            )}
          </div>

          {/* Risk Flags */}
          {data.master?.risk_flags && Object.entries(data.master.risk_flags).some(([, v]) => v) && (
            <div style={{
              background: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
              border: `1px solid ${C.border}`, boxShadow: C.shadow,
            }}>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Alertas activas
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(data.master.risk_flags).filter(([, v]) => v).map(([key]) => (
                  <span key={key} style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: C.redBg, color: C.red, border: `1px solid ${C.red}44`,
                  }}>
                    ⚠ {key.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Nav */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "8px 16px calc(16px + env(safe-area-inset-bottom))",
          background: `linear-gradient(to top, ${C.bg} 75%, transparent)`,
        }}>
          <div style={{ maxWidth: 448, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {navButtons.map((btn) => (
              <Link key={btn.label} href={btn.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  padding: "10px 4px",
                  background: C.card, borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  boxShadow: C.shadow,
                }}>
                  <span style={{ fontSize: 20 }}>{btn.emoji}</span>
                  <span style={{ fontSize: 10, color: C.secondary, fontWeight: 600 }}>{btn.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </SessionGuard>
  );
}
