"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/app/lib/apex-tokens";

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("apex_session");
    if (session) {
      try {
        const s = JSON.parse(session);
        if (s?.email) {
          router.replace(s.onboarding_completed === false ? "/onboarding/garmin" : "/");
          return;
        }
      } catch { /* ignore */ }
    }
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px",
    }}>

      {/* Logo */}
      <div style={{
        width: 80, height: 80, borderRadius: 22,
        background: C.purple, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 40, marginBottom: 24,
        boxShadow: `0 8px 32px ${C.purple}44`,
      }}>
        ⚡
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: "0 0 8px", letterSpacing: "-1px" }}>
        My Apex
      </h1>
      <p style={{ fontSize: 15, color: C.muted, margin: "0 0 48px", textAlign: "center", lineHeight: 1.5 }}>
        Tu rendimiento,{"\n"}descifrado.
      </p>

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/signup" style={{ textDecoration: "none" }}>
          <div style={{
            background: C.purple, borderRadius: 14,
            padding: "16px", textAlign: "center",
            color: "#fff", fontSize: 16, fontWeight: 700,
            boxShadow: `0 4px 20px ${C.purple}44`,
          }}>
            Crear cuenta
          </div>
        </Link>

        <Link href="/login" style={{ textDecoration: "none" }}>
          <div style={{
            background: C.card, borderRadius: 14,
            padding: "16px", textAlign: "center",
            color: C.text, fontSize: 16, fontWeight: 600,
            border: `1px solid ${C.border}`,
          }}>
            Ya tengo cuenta
          </div>
        </Link>
      </div>

      <p style={{ fontSize: 11, color: C.muted, marginTop: 32, textAlign: "center", lineHeight: 1.6 }}>
        Conecta tu Garmin y recibe análisis personalizados{"\n"}
        de sueño, recuperación y entrenamiento.
      </p>

    </div>
  );
}
