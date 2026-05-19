"use client";

import Link from "next/link";
import { C } from "@/app/lib/apex-tokens";

// ── Keyframes (inject once per page via <ApexStyles />) ────────────────────
export function ApexStyles() {
  return (
    <style>{`
      @keyframes apex-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      @keyframes apex-shimmer { 0%,100%{opacity:.55} 50%{opacity:.9} }
      @keyframes apex-dots { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
    `}</style>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: 16,
      boxShadow: C.shadow, border: `1px solid ${C.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── ApexBadge ─────────────────────────────────────────────────────────────
export function ApexBadge({ label = "ApexAI" }: { label?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: C.purple, color: "#fff",
      fontSize: 11, fontWeight: 700,
      padding: "2px 8px", borderRadius: 20,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "#4ade80", display: "inline-block",
        animation: "apex-pulse 2s infinite",
      }} />
      {label}
    </span>
  );
}

// ── MotorBadge ────────────────────────────────────────────────────────────
export function MotorBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#F0EFF9", color: C.purpleText,
      borderRadius: 99, padding: "2px 8px",
      fontSize: 9, fontWeight: 700,
    }}>
      ⚙ Motor Apex
    </span>
  );
}

// ── SectionHead ───────────────────────────────────────────────────────────
export function SectionHead({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between", marginBottom: 12,
    }}>
      <span style={{
        fontSize: 13, fontWeight: 700, color: C.muted,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {children}
      </span>
      {badge}
    </div>
  );
}

// ── MetricCard ────────────────────────────────────────────────────────────
export function MetricCard({
  color, bg, label, value, sub,
}: {
  color: string; bg: string; label: string; value: string; sub: string;
}) {
  return (
    <div style={{
      background: bg, borderRadius: 14,
      padding: "14px 14px 12px",
      border: `1px solid ${color}22`,
    }}>
      <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 5, letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.secondary, lineHeight: 1.3 }}>{sub}</div>
    </div>
  );
}

// ── DeltaPill ─────────────────────────────────────────────────────────────
export function DeltaPill({ delta }: { delta: string | null }) {
  if (!delta) return null;
  const isPos = delta.startsWith("+");
  const isNeg = delta.startsWith("-");
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 7px",
      background: isPos ? C.greenBg : isNeg ? C.redBg : "#F5F4F1",
      color: isPos ? C.green : isNeg ? C.red : C.muted,
      whiteSpace: "nowrap",
    }}>
      {delta}
    </span>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────
export function Chip({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: "3px 10px", borderRadius: 20,
      border: `1px solid ${C.purple}33`,
      color: C.purple, background: C.purpleLight,
    }}>
      {label}
    </span>
  );
}

// ── AiLoadingCard ─────────────────────────────────────────────────────────
export function AiLoadingCard() {
  return (
    <Card style={{ background: C.purpleLight, border: `1px solid ${C.purple}33`, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <ApexBadge />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.purple }}>Apex analizando tu información</div>
          <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>Esto puede tomar hasta 60 segundos…</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: C.purple, opacity: 0.6,
              animation: `apex-dots 1.4s ease-in-out ${i * 0.22}s infinite`,
            }}
          />
        ))}
      </div>
    </Card>
  );
}

// ── ShimmerSkeleton ───────────────────────────────────────────────────────
export function ShimmerSkeleton({ heights = [100, 80, 200, 160] }: { heights?: number[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            height: h, borderRadius: 16,
            background: "#E8E6E0",
            animation: "apex-shimmer 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ── PageNav ───────────────────────────────────────────────────────────────
export function PageNav({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{
      background: C.bg, padding: "16px 20px 8px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <Link href="/" style={{ color: C.secondary, textDecoration: "none", fontSize: 14 }}>← Inicio</Link>
      <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</span>
      <div style={{ width: 52, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

// ── CorrelationsCard ──────────────────────────────────────────────────────
interface AiCorrelation {
  systems: string[];
  root_cause: string;
  insight: string;
  severity: "high" | "medium";
}

export function CorrelationsCard({ correlations }: { correlations: AiCorrelation[] }) {
  return (
    <Card style={{ marginBottom: 12, border: `1px solid ${C.purple}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <ApexBadge />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Señales conectadas</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {correlations.map((corr, i) => {
          const isHigh      = corr.severity === "high";
          const borderColor = isHigh ? C.red : C.amber;
          const bgColor     = isHigh ? C.redBg : C.amberBg;
          return (
            <div key={i} style={{
              background: bgColor, borderRadius: 10,
              padding: "12px 14px", borderLeft: `3px solid ${borderColor}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {corr.systems.map((sys, si) => (
                  <span key={si} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      background: C.card, color: C.text,
                      padding: "2px 8px", borderRadius: 20,
                      border: `1px solid ${C.border}`,
                    }}>{sys}</span>
                    {si < corr.systems.length - 1 && (
                      <span style={{ fontSize: 13, color: borderColor, fontWeight: 700 }}>↔</span>
                    )}
                  </span>
                ))}
              </div>
              {corr.root_cause && (
                <div style={{ fontSize: 11, color: C.secondary, marginBottom: 5, fontStyle: "italic" }}>
                  {corr.root_cause}
                </div>
              )}
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.55, margin: 0 }}>{corr.insight}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
