"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/app/lib/apex-tokens";

interface Profile {
  user_id: string;
  garmin_email: string;
  name?: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  sex?: string;
  sport_focus: string[];
  ftp?: number;
  max_hr?: number;
  goal_event?: string;
  goal_target?: string;
  goal_date?: string;
  experience_years?: number;
  weekly_hours_available?: number;
}

interface HealthFlag {
  activo?: boolean;
  severidad?: string;
  porcentaje_noches_bajas?: number;
}

interface TrendFlag {
  direccion?: string;
  ultimos_14_dias?: number;
}

interface Baseline {
  generated_at: string;
  data_window: { sleep_nights: number; readiness_days: number; activities: number };
  physiological_baselines: {
    hrv_basal?: { mean: number; std: number; n: number };
    spo2_nadir_basal?: { p25: number; median: number; n_nights: number };
    recovery_basal?: { mean: number; p25: number };
    readiness_basal?: { mean: number; p25: number };
    stress_basal?: { mean: number };
    bb_recharge_basal?: { mean: number; p25: number };
  };
  patterns: {
    mejor_dia_semana?: { dia: string; readiness_promedio: number };
    peor_dia_semana?: { dia: string; readiness_promedio: number };
    patron_sueno?: { tipo: string; nota: string };
    hora_habitual_entreno?: { franja: string };
    dias_recuperacion_optimos?: { promedio: number };
  };
  sustainable_load: {
    tss_semana_max_sostenible?: { valor: number; n_semanas: number };
    dias_alto_volumen_max?: { valor: number };
  };
  health_flags: {
    spo2_risk?: HealthFlag;
    hrv_trend?: TrendFlag;
    recovery_trend?: TrendFlag;
    overtraining_risk?: { activo: boolean; racha_maxima_dias_bajos: number };
  };
  goal_coherence: {
    ftp_wkg_real?: { valor: number | null; ftp_watts: number; nota?: string };
    ctl_aproximado?: number;
    semanas_restantes?: number;
    fase_actual?: string;
    objetivo_viable?: { viable: boolean | null; razon: string };
  };
  athlete_context_string: string;
}

const SPORT_OPTIONS = [
  { value: "cycling", label: "Ciclismo" },
  { value: "mountain_biking", label: "MTB" },
  { value: "running", label: "Running" },
  { value: "triathlon", label: "Triatlón" },
  { value: "swimming", label: "Natación" },
  { value: "health", label: "Salud general" },
];

function trendColor(dir?: string): string {
  if (dir === "improving") return C.green;
  if (dir === "declining") return C.red;
  return C.amber;
}

function trendArrow(dir?: string): string {
  if (dir === "improving") return "↑";
  if (dir === "declining") return "↓";
  return "→";
}

function scoreColor(val: number, thresholds: [number, number] = [50, 70]): string {
  if (val >= thresholds[1]) return C.green;
  if (val >= thresholds[0]) return C.amber;
  return C.red;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 12px" }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.purple }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function BaselineCard({ label, value, unit, sub, flagColor }: {
  label: string; value: string | number | null; unit?: string;
  sub?: string; flagColor?: string;
}) {
  const color = flagColor ?? C.text;
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: 12, textAlign: "center", border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
      <p style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color, margin: "0 0 2px" }}>
        {value !== null && value !== undefined ? `${value}${unit ?? ""}` : "—"}
      </p>
      {sub && <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{sub}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 14,
  color: C.text,
  background: C.bg,
  border: `1px solid ${C.border}`,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: C.secondary,
  display: "block",
  marginBottom: 5,
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setBaseline(d.baseline);
        if (d.profile) setForm(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleChange(field: keyof Profile, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function toggleSport(value: string) {
    const current = form.sport_focus ?? [];
    const updated = current.includes(value)
      ? current.filter((s) => s !== value)
      : [...current, value];
    handleChange("sport_focus", updated);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setProfile(data.profile);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <p style={{ color: C.muted, fontSize: 14 }}>Cargando perfil...</p>
      </div>
    );
  }

  const bl = baseline;
  const phys = bl?.physiological_baselines ?? {};
  const pat = bl?.patterns ?? {};
  const flags = bl?.health_flags ?? {};
  const gc = bl?.goal_coherence ?? {};

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div className="max-w-md mx-auto px-4 py-6 pb-10">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Link href="/" style={{ color: C.muted, textDecoration: "none", fontSize: 20, lineHeight: 1 }}>←</Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.3px" }}>Mi Perfil</h1>
            <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{profile?.garmin_email}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: saved ? C.greenBg : C.purple,
              color: saved ? C.green : "#fff",
              border: saved ? `1px solid ${C.green}44` : "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar"}
          </button>
        </div>

        {/* Datos personales */}
        <SectionTitle>Datos personales</SectionTitle>
        <div style={{ background: C.card, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Tu nombre"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Edad</label>
              <input
                type="number"
                value={form.age ?? ""}
                onChange={(e) => handleChange("age", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="38"
                min={15} max={80}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Peso (kg)</label>
              <input
                type="number"
                value={form.weight_kg ?? ""}
                onChange={(e) => handleChange("weight_kg", e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="75"
                min={40} max={150} step={0.5}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Altura (cm)</label>
              <input
                type="number"
                value={form.height_cm ?? ""}
                onChange={(e) => handleChange("height_cm", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="175"
                min={140} max={220}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Sexo</label>
              <select
                value={form.sex ?? ""}
                onChange={(e) => handleChange("sex", e.target.value || undefined)}
                style={inputStyle}
              >
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Años de experiencia</label>
              <input
                type="number"
                value={form.experience_years ?? ""}
                onChange={(e) => handleChange("experience_years", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="5"
                min={0} max={40}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Deportes */}
        <SectionTitle>Deportes</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SPORT_OPTIONS.map((opt) => {
            const selected = (form.sport_focus ?? []).includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleSport(opt.value)}
                style={{
                  padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                  background: selected ? C.purple : C.card,
                  color: selected ? "#fff" : C.secondary,
                  border: `1px solid ${selected ? C.purple : C.border}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Fisiología declarada */}
        <SectionTitle>Fisiología declarada</SectionTitle>
        <div style={{ background: C.card, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>
                FTP declarado (W)
                {phys.hrv_basal && (
                  <span style={{ color: C.muted, fontWeight: 400 }}> · real: {bl?.goal_coherence?.ftp_wkg_real?.ftp_watts ?? "—"}W</span>
                )}
              </label>
              <input
                type="number"
                value={form.ftp ?? ""}
                onChange={(e) => handleChange("ftp", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="230"
                min={80} max={500}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>FC máxima (bpm)</label>
              <input
                type="number"
                value={form.max_hr ?? ""}
                onChange={(e) => handleChange("max_hr", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="185"
                min={140} max={220}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Horas semanales disponibles para entrenar</label>
            <input
              type="number"
              value={form.weekly_hours_available ?? ""}
              onChange={(e) => handleChange("weekly_hours_available", e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="8"
              min={1} max={30} step={0.5}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Objetivo */}
        <SectionTitle>Objetivo / Evento</SectionTitle>
        <div style={{ background: C.card, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
          <div>
            <label style={labelStyle}>Nombre del evento</label>
            <input
              type="text"
              value={form.goal_event ?? ""}
              onChange={(e) => handleChange("goal_event", e.target.value || undefined)}
              placeholder="Ej: Xterra MTY, Ironman 70.3 Cozumel..."
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Meta de tiempo / resultado</label>
              <input
                type="text"
                value={form.goal_target ?? ""}
                onChange={(e) => handleChange("goal_target", e.target.value || undefined)}
                placeholder="Ej: Sub 2:45"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Fecha del evento</label>
              <input
                type="date"
                value={form.goal_date ?? ""}
                onChange={(e) => handleChange("goal_date", e.target.value || undefined)}
                style={inputStyle}
              />
            </div>
          </div>

          {gc.semanas_restantes !== undefined && (
            <div style={{ background: C.bg, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 2px" }}>
                    {gc.semanas_restantes} semanas al evento
                  </p>
                  {gc.fase_actual && (
                    <p style={{ fontSize: 11, color: C.green, textTransform: "capitalize", margin: 0 }}>
                      Fase actual: {gc.fase_actual}
                    </p>
                  )}
                </div>
                {gc.objetivo_viable && (
                  <span style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 700,
                    background: gc.objetivo_viable.viable === true ? C.greenBg :
                                gc.objetivo_viable.viable === false ? C.redBg : C.amberBg,
                    color: gc.objetivo_viable.viable === true ? C.green :
                           gc.objetivo_viable.viable === false ? C.red : C.amber,
                  }}>
                    {gc.objetivo_viable.viable === true ? "Viable" :
                     gc.objetivo_viable.viable === false ? "Ajustar plan" : "Evaluar"}
                  </span>
                )}
              </div>
              {gc.objetivo_viable?.razon && (
                <p style={{ fontSize: 11, color: C.muted, marginTop: 6, marginBottom: 0 }}>{gc.objetivo_viable.razon}</p>
              )}
            </div>
          )}
        </div>

        {/* Baseline fisiológico */}
        {bl && (
          <>
            <SectionTitle>Tu huella fisiológica</SectionTitle>
            <p style={{ fontSize: 11, color: C.muted, margin: "-8px 0 12px" }}>
              Calculado de {bl.data_window.sleep_nights} noches · {bl.data_window.readiness_days} días · {bl.data_window.activities} actividades
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {phys.hrv_basal && (
                <BaselineCard label="HRV basal" value={Math.round(phys.hrv_basal.mean)} unit=" ms" sub={`±${phys.hrv_basal.std} ms`} flagColor={scoreColor(phys.hrv_basal.mean, [45, 55])} />
              )}
              {phys.recovery_basal && (
                <BaselineCard label="Recovery basal" value={Math.round(phys.recovery_basal.mean)} unit="/100" sub={`p25: ${phys.recovery_basal.p25}`} flagColor={scoreColor(phys.recovery_basal.mean)} />
              )}
              {phys.readiness_basal && (
                <BaselineCard label="Readiness basal" value={Math.round(phys.readiness_basal.mean)} unit="/100" sub={`p25: ${phys.readiness_basal.p25}`} flagColor={scoreColor(phys.readiness_basal.mean)} />
              )}
              {phys.spo2_nadir_basal && (
                <BaselineCard label="SpO₂ nadir" value={phys.spo2_nadir_basal.p25} unit="%" sub="percentil 25"
                  flagColor={phys.spo2_nadir_basal.p25 < 88 ? C.red : phys.spo2_nadir_basal.p25 < 92 ? C.amber : C.green} />
              )}
              {phys.stress_basal && (
                <BaselineCard label="Estrés basal" value={Math.round(phys.stress_basal.mean)} unit="/100"
                  flagColor={phys.stress_basal.mean > 30 ? C.red : phys.stress_basal.mean > 20 ? C.amber : C.green} />
              )}
              {phys.bb_recharge_basal && (
                <BaselineCard label="Recarga BB" value={Math.round(phys.bb_recharge_basal.mean)} unit=" pts" sub="nocturna" flagColor={scoreColor(phys.bb_recharge_basal.mean, [40, 55])} />
              )}
              {gc.ftp_wkg_real?.valor && (
                <BaselineCard label="W/kg real" value={gc.ftp_wkg_real.valor} flagColor="#f97316" />
              )}
              {gc.ctl_aproximado !== undefined && (
                <BaselineCard label="CTL aprox." value={Math.round(gc.ctl_aproximado)} flagColor={C.muted} />
              )}
            </div>

            {/* Patrones */}
            {Object.keys(pat).length > 0 && (
              <>
                <SectionTitle>Patrones detectados</SectionTitle>
                <div style={{ background: C.card, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  {pat.mejor_dia_semana && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: C.secondary }}>Mejor día de la semana</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.green, textTransform: "capitalize" }}>
                        {pat.mejor_dia_semana.dia} · {pat.mejor_dia_semana.readiness_promedio}/100
                      </span>
                    </div>
                  )}
                  {pat.peor_dia_semana && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: C.secondary }}>Peor día de la semana</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.red, textTransform: "capitalize" }}>
                        {pat.peor_dia_semana.dia} · {pat.peor_dia_semana.readiness_promedio}/100
                      </span>
                    </div>
                  )}
                  {pat.hora_habitual_entreno && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: C.secondary }}>Hora habitual de entrenamiento</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: "capitalize" }}>
                        {pat.hora_habitual_entreno.franja}
                      </span>
                    </div>
                  )}
                  {pat.dias_recuperacion_optimos && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: C.secondary }}>Días de recuperación entre sesiones</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                        {pat.dias_recuperacion_optimos.promedio} días
                      </span>
                    </div>
                  )}
                  {pat.patron_sueno && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: C.secondary }}>Cronótipo</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: "capitalize" }}>
                        {pat.patron_sueno.tipo}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Health flags */}
            {Object.keys(flags).length > 0 && (
              <>
                <SectionTitle>Flags de salud y tendencias</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {flags.spo2_risk && (
                    <div style={{
                      background: flags.spo2_risk.activo ? C.redBg : C.card,
                      borderRadius: 14, padding: 12,
                      display: "flex", alignItems: "center", gap: 12,
                      border: `1px solid ${flags.spo2_risk.activo ? C.red + "44" : C.border}`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: flags.spo2_risk.activo ? C.red : C.green }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: flags.spo2_risk.activo ? C.red : C.green, margin: "0 0 2px" }}>
                          Hipoxia nocturna {flags.spo2_risk.activo ? `— ${flags.spo2_risk.severidad}` : "— sin riesgo"}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                          SpO₂ {"<"} 88% en el {flags.spo2_risk.porcentaje_noches_bajas}% de las noches
                        </p>
                      </div>
                    </div>
                  )}

                  {[
                    { key: "hrv_trend", label: "HRV (últimas 2 semanas)" },
                    { key: "recovery_trend", label: "Recovery (últimas 2 semanas)" },
                  ].map(({ key, label }) => {
                    const f = flags[key as keyof typeof flags] as TrendFlag | undefined;
                    if (!f?.direccion) return null;
                    return (
                      <div key={key} style={{ background: C.card, borderRadius: 14, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 13, color: C.secondary }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: trendColor(f.direccion) }}>
                          {trendArrow(f.direccion)} {f.ultimos_14_dias !== undefined ? Math.round(f.ultimos_14_dias) : ""}
                          {key === "hrv_trend" ? " ms" : "/100"}
                        </span>
                      </div>
                    );
                  })}

                  {flags.overtraining_risk && (
                    <div style={{
                      background: flags.overtraining_risk.activo ? C.redBg : C.card,
                      borderRadius: 14, padding: 12,
                      display: "flex", alignItems: "center", gap: 12,
                      border: `1px solid ${flags.overtraining_risk.activo ? C.red + "44" : C.border}`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: flags.overtraining_risk.activo ? C.red : C.green }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: flags.overtraining_risk.activo ? C.red : C.green, margin: "0 0 2px" }}>
                          Riesgo sobreentrenamiento — {flags.overtraining_risk.activo ? "activo" : "sin riesgo"}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                          Racha máx: {flags.overtraining_risk.racha_maxima_dias_bajos} días con readiness {"<"} 45
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Carga sostenible */}
            {bl.sustainable_load?.tss_semana_max_sostenible && (
              <>
                <SectionTitle>Carga sostenible</SectionTitle>
                <div style={{ background: C.card, borderRadius: 16, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <div style={{ background: C.bg, borderRadius: 12, padding: 12, textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 600 }}>TSS semanal máx</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: "0 0 2px" }}>
                      {Math.round(bl.sustainable_load.tss_semana_max_sostenible.valor ?? 0)}
                    </p>
                    <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>sin caída de HRV</p>
                  </div>
                  {bl.sustainable_load.dias_alto_volumen_max && (
                    <div style={{ background: C.bg, borderRadius: 12, padding: 12, textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Días carga alta máx</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: "0 0 2px" }}>
                        {bl.sustainable_load.dias_alto_volumen_max.valor}
                      </p>
                      <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>consecutivos</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Context string */}
            <SectionTitle>Contexto para IA</SectionTitle>
            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
              <p style={{ fontSize: 11, color: C.secondary, lineHeight: 1.7, margin: "0 0 8px" }}>
                {bl.athlete_context_string}
              </p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
                Actualizado: {new Date(bl.generated_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </>
        )}

        {/* Save button bottom */}
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "14px", borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: saved ? C.greenBg : C.purple,
              color: saved ? C.green : "#fff",
              border: saved ? `1px solid ${C.green}44` : "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Guardando..." : saved ? "✓ Perfil guardado" : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  );
}
