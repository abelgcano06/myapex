"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C } from "@/app/lib/apex-tokens";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Completa todos los campos.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Error al crear la cuenta.");
        return;
      }
      localStorage.setItem("apex_session", JSON.stringify({
        email: data.email,
        user_id: data.user_id,
        name: data.name,
        onboarding_completed: false,
      }));
      router.push("/onboarding/garmin");
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

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
            ⚡
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: "-0.5px" }}>Crear cuenta</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Tu cuenta en My Apex</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>Nombre completo</label>
            <input
              type="text" value={form.name} onChange={e => handleChange("name", e.target.value)}
              placeholder="Abel García" autoComplete="name" style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>Email (de My Apex)</label>
            <input
              type="email" value={form.email} onChange={e => handleChange("email", e.target.value)}
              placeholder="tu@email.com" autoComplete="email" style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>Contraseña</label>
            <input
              type="password" value={form.password} onChange={e => handleChange("password", e.target.value)}
              placeholder="Mínimo 8 caracteres" autoComplete="new-password" style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>Confirmar contraseña</label>
            <input
              type="password" value={form.confirm} onChange={e => handleChange("confirm", e.target.value)}
              placeholder="Repite la contraseña" autoComplete="new-password" style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: C.red, background: C.redBg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: C.purple, color: "#fff", border: "none",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creando cuenta..." : "Continuar →"}
          </button>
        </form>

        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 20 }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: C.purple, fontWeight: 600, textDecoration: "none" }}>
            Iniciar sesión
          </Link>
        </p>

      </div>
    </div>
  );
}
