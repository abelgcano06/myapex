"use client";

import { useState } from "react";
import { C } from "@/app/lib/apex-tokens";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem(
          "apex_session",
          JSON.stringify({ email, user_id: data.user_id })
        );
        window.location.href = "/syncing";
      } else {
        setError(data.error || "Error al iniciar sesión.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      background: C.bg,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 360,
        background: C.card,
        borderRadius: 24,
        padding: 32,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        border: `1px solid ${C.border}`,
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: C.purple,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 26,
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            My Apex
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Your peak performance, decoded.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="tu@email.com"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                fontSize: 14,
                color: C.text,
                background: C.bg,
                border: `1px solid ${C.border}`,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.secondary, display: "block", marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) doLogin(); }}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                fontSize: 14,
                color: C.text,
                background: C.bg,
                border: `1px solid ${C.border}`,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              color: C.red,
              background: C.redBg,
              border: `1px solid ${C.red}33`,
              textAlign: "center",
            }}>
              {error}
            </div>
          )}

          <button
            onClick={doLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              color: "#fff",
              background: loading ? C.purpleMid : C.purple,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
              transition: "background 0.15s",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
