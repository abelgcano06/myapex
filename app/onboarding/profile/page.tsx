"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/app/lib/apex-tokens";

const SPORT_OPTIONS = [
  { value: "cycling",        label: "Ciclismo",     icon: "🚴" },
  { value: "mountain_biking",label: "MTB",          icon: "⛰" },
  { value: "running",        label: "Running",      icon: "🏃" },
  { value: "triathlon",      label: "Triatlón",     icon: "🏊" },
  { value: "swimming",       label: "Natación",     icon: "💧" },
  { value: "health",         label: "Salud general",icon: "❤️" },
];

const INJURY_OPTIONS = [
  { value: "knee",     label: "Rodilla" },
  { value: "back",     label: "Espalda" },
  { value: "shoulder", label: "Hombro" },
  { value: "hip",      label: "Cadera" },
  { value: "ankle",    label: "Tobillo" },
  { value: "neck",     label: "Cuello" },
];

interface ProfileForm {
  age: string; weight_kg: string; height_cm: string; sex: string;
  sport_focus: string[]; experience_years: string; weekly_hours_available: string;
  competition_level: string; has_coach: string;
  ftp: string; max_hr: string;
  goal_event: string; goal_target: string; goal_date: string;
  work_type: string; sleep_goal_hours: string; injuries: string[];
}

const EMPTY: ProfileForm = {
  age: "", weight_kg: "", height_cm: "", sex: "",
  sport_focus: [], experience_years: "", weekly_hours_available: "",
  competition_level: "", has_coach: "",
  ftp: "", max_hr: "",
  goal_event: "", goal_target: "", goal_date: "",
  work_type: "", sleep_goal_hours: "", injuries: [],
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 13px", borderRadius: 11, fontSize: 14,
  color: C.text, background: C.bg, border: `1px solid ${C.border}`,
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 5,
};

function ChipGroup({ options, value, multi, onChange }: {
  options: { value: string; label: string; icon?: string }[];
  value: string | string[];
  multi?: boolean;
  onChange: (v: string | string[]) => void;
}) {
  function toggle(v: string) {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
    } else {
      onChange(v === value ? "" : v);
    }
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(opt => {
        const active = multi ? (value as string[]).includes(opt.value) : value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => toggle(opt.value)} style={{
            padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: active ? C.purple : C.card,
            color: active ? "#fff" : C.secondary,
            border: `1px solid ${active ? C.purple : C.border}`, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [apexEmail, setApexEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("apex_session");
    if (!session) { router.replace("/welcome"); return; }
    try {
      const s = JSON.parse(session);
      if (!s?.email) { router.replace("/welcome"); return; }
      if (s.onboarding_completed) { router.replace("/"); return; }
      setApexEmail(s.email);
      setUserId(s.user_id ?? "");
    } catch { router.replace("/welcome"); }
  }, [router]);

  function set(field: keyof ProfileForm, value: string | string[]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // Save profile via existing profile API
      const profilePayload = {
        user_id: userId,
        garmin_email: apexEmail,
        name: JSON.parse(localStorage.getItem("apex_session") ?? "{}").name ?? "",
        age: form.age ? parseInt(form.age) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        height_cm: form.height_cm ? parseInt(form.height_cm) : undefined,
        sex: form.sex || undefined,
        sport_focus: form.sport_focus,
        experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
        weekly_hours_available: form.weekly_hours_available ? parseFloat(form.weekly_hours_available) : undefined,
        competition_level: form.competition_level || undefined,
        has_coach: form.has_coach === "true" ? true : form.has_coach === "false" ? false : undefined,
        ftp: form.ftp ? parseInt(form.ftp) : undefined,
        max_hr: form.max_hr ? parseInt(form.max_hr) : undefined,
        goal_event: form.goal_event || undefined,
        goal_target: form.goal_target || undefined,
        goal_date: form.goal_date || undefined,
        work_type: form.work_type || undefined,
        sleep_goal_hours: form.sleep_goal_hours ? parseFloat(form.sleep_goal_hours) : undefined,
        injuries: form.injuries,
      };

      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      });

      // Mark onboarding as completed
      await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: apexEmail }),
      });

      const session = JSON.parse(localStorage.getItem("apex_session") ?? "{}");
      localStorage.setItem("apex_session", JSON.stringify({ ...session, onboarding_completed: true }));

      // Trigger first sync
      fetch("/api/sync?sections=sleep,day,activities,master,ftp,profile", { method: "POST" }).catch(() => {});

      router.push("/syncing");
    } catch {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* Pasos */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, justifyContent: "center" }}>
          {["Cuenta", "Garmin", "Perfil"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: i === 2 ? C.purple : C.green,
                color: "#fff",
              }}>
                {i < 2 ? "✓" : "3"}
              </div>
              <span style={{ fontSize: 11, color: i === 2 ? C.purple : C.green, fontWeight: i === 2 ? 700 : 400 }}>{step}</span>
              {i < 2 && <div style={{ width: 20, height: 1, background: C.green }} />}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: "-0.5px" }}>Tu perfil de atleta</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Mientras descargas tus datos de Garmin</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Sección 1 — Quién eres */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Quién eres</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Edad</label>
                <input type="number" value={form.age} onChange={e => set("age", e.target.value)} placeholder="35" min={15} max={80} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Peso (kg)</label>
                <input type="number" value={form.weight_kg} onChange={e => set("weight_kg", e.target.value)} placeholder="75" min={40} max={150} step={0.5} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Altura (cm)</label>
                <input type="number" value={form.height_cm} onChange={e => set("height_cm", e.target.value)} placeholder="175" min={140} max={220} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Sexo</label>
              <ChipGroup
                options={[{ value: "M", label: "Masculino" }, { value: "F", label: "Femenino" }]}
                value={form.sex}
                onChange={v => set("sex", v as string)}
              />
            </div>
          </div>

          {/* Sección 2 — Tu entrenamiento */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Tu entrenamiento</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Deporte(s) principal(es)</label>
              <ChipGroup options={SPORT_OPTIONS} value={form.sport_focus} multi onChange={v => set("sport_focus", v as string[])} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Años de experiencia</label>
                <input type="number" value={form.experience_years} onChange={e => set("experience_years", e.target.value)} placeholder="5" min={0} max={40} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Horas/semana</label>
                <input type="number" value={form.weekly_hours_available} onChange={e => set("weekly_hours_available", e.target.value)} placeholder="8" min={1} max={30} step={0.5} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nivel de competencia</label>
              <ChipGroup
                options={[{ value: "recreational", label: "Recreativo" }, { value: "amateur", label: "Amateur" }, { value: "competitor", label: "Competidor" }]}
                value={form.competition_level}
                onChange={v => set("competition_level", v as string)}
              />
            </div>

            <div>
              <label style={labelStyle}>¿Tienes entrenador?</label>
              <ChipGroup
                options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]}
                value={form.has_coach}
                onChange={v => set("has_coach", v as string)}
              />
            </div>
          </div>

          {/* Sección 3 — Tus números */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Tus números</p>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 14px" }}>Si no los sabes, los estimamos de tu historial de Garmin</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>FTP (W)</label>
                <input type="number" value={form.ftp} onChange={e => set("ftp", e.target.value)} placeholder="230" min={80} max={500} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>FC máxima (bpm)</label>
                <input type="number" value={form.max_hr} onChange={e => set("max_hr", e.target.value)} placeholder="185" min={140} max={220} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Sección 4 — Objetivo */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Tu objetivo</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Evento o meta</label>
                <input type="text" value={form.goal_event} onChange={e => set("goal_event", e.target.value)} placeholder="Xterra MTY, Ironman 70.3..." style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle}>Meta (opcional)</label>
                  <input type="text" value={form.goal_target} onChange={e => set("goal_target", e.target.value)} placeholder="Sub 2:45" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha del evento</label>
                  <input type="date" value={form.goal_date} onChange={e => set("goal_date", e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Sección 5 — Contexto */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Contexto de vida</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Tipo de trabajo</label>
              <ChipGroup
                options={[{ value: "sedentary", label: "Sedentario" }, { value: "mixed", label: "Mixto" }, { value: "active", label: "Activo" }]}
                value={form.work_type}
                onChange={v => set("work_type", v as string)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Meta de sueño (horas)</label>
              <input type="number" value={form.sleep_goal_hours} onChange={e => set("sleep_goal_hours", e.target.value)} placeholder="8" min={5} max={10} step={0.5} style={{ ...inputStyle, maxWidth: 120 }} />
            </div>

            <div>
              <label style={labelStyle}>Lesiones recurrentes (opcional)</label>
              <ChipGroup options={INJURY_OPTIONS} value={form.injuries} multi onChange={v => set("injuries", v as string[])} />
            </div>
          </div>

          {/* Botón finalizar */}
          <button
            onClick={handleFinish}
            disabled={saving}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: C.purple, color: "#fff", border: "none",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              boxShadow: `0 4px 20px ${C.purple}44`,
            }}
          >
            {saving ? "Guardando..." : "¡Listo! Comenzar →"}
          </button>

          <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: 0 }}>
            Puedes editar todo esto después en tu perfil
          </p>
        </div>
      </div>
    </div>
  );
}
