"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/app/lib/apex-tokens";

export default function OnboardingGarminPage() {
  const router = useRouter();
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("apex_session");
    if (!session) { router.replace("/welcome"); return; }
    try {
      const s = JSON.parse(session);
      if (!s?.email) { router.replace("/welcome"); return; }
      if (s.onboarding_completed) { router.replace("/"); return; }
      setUserName(s.name ?? "");
    } catch { router.replace("/welcome"); }
  }, [router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!garminEmail.trim() || !garminPassword) {
      setError("Ingresa tu email y contraseña de Garmin Connect.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/validate-garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garmin_email: garminEmail.trim(), garmin_password: garminPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo conectar con Garmin. Verifica tus credenciales.");
        return;
      }
      // Update session
      const session = JSON.parse(localStorage.getItem("apex_session") ?? "{}");
      localStorage.setItem("apex_session", JSON.stringify({ ...session, garmin_connected: true }));
      router.push("/onboarding/profile");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 15,
    color: C.text, background: C.bg, border: `1px solid ${C.border}`,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Pasos */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 32, justifyContent: "center" }}>
          {["Cuenta", "Garmin", "Perfil"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: i === 1 ? C.purple : i < 1 ? C.green : C.border,
                color: i <= 1 ? "#fff" : C.muted,
              }}>
                {i < 1 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 11, color: i === 1 ? C.purple : C.muted, fontWeight: i === 1 ? 700 : 400 }}>{step}</span>
              {i < 2 && <div style={{ width: 20, height: 1, background: C.border }} />}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⌚</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
            {userName ? `Hola ${userName.split(" ")[0]}, ` : ""}conecta tu Garmin
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Usamos tus credenciales de Garmin Connect{"\n"}solo para descargar tus datos de entrenamiento.
          </p>
        </div>

        <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>Email de Garmin Connect</label>
            <input
              type="email" value={garminEmail} onChange={e => { setGarminEmail(e.target.value); setError(""); }}
              placeholder="tu@garmin.com" autoComplete="email" style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>Contraseña de Garmin Connect</label>
            <input
              type="password" value={garminPassword} onChange={e => { setGarminPassword(e.target.value); setError(""); }}
              placeholder="Tu contraseña de Garmin" autoComplete="current-password" style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: C.redBg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.red}33` }}>
              <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{error}</p>
            </div>
          )}

          {loading && (
            <div style={{ background: C.purpleLight, borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ fontSize: 12, color: C.purple, margin: 0, fontWeight: 600 }}>
                Conectando con Garmin... esto puede tomar unos segundos.
              </p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: C.purple, color: "#fff", border: "none",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Verificando..." : "Conectar y continuar →"}
          </button>
        </form>

        <div style={{ marginTop: 20, background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            🔒 Tus credenciales se guardan de forma segura en tu propio servidor y nunca se comparten con terceros.
          </p>
        </div>

      </div>
    </div>
  );
}
