import Anthropic from "@anthropic-ai/sdk";
import { gsFetch } from "@/lib/garmin-server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { sleepData, primaryLimiter } = await req.json();

  // Fetch athlete profile internally
  let ftp: number | null = null;
  let goal: string | null = null;
  try {
    const r = await gsFetch("/api/profile-full");
    if (r.ok) {
      const d = await r.json();
      const p = d?.profile ?? {};
      ftp  = p.ftp_apex ?? p.ftp_current ?? null;
      goal = [p.goal_event, p.goal_date].filter(Boolean).join(" — ") || null;
    }
  } catch { /* non-fatal */ }

  const pct = (v: number | null) =>
    v != null ? `${(v * 100).toFixed(1)}%` : "—";

  const prompt = `Eres el coach de Apex Cycling. Analiza esta noche de sueño en máximo 4 oraciones directas. Tono de coach profesional, sin rodeos.

ATLETA:${ftp ? ` FTP ${ftp}W` : ""}${goal ? ` · Objetivo: ${goal}` : ""}

DATOS DE ESTA NOCHE:
- Recuperación general: ${sleepData.overall_recovery_score ?? "—"}/100
- HRV: ${sleepData.avg_overnight_hrv ?? "—"}ms · Estado: ${sleepData.hrv_status ?? "—"}
- Sueño profundo: ${pct(sleepData.deep_ratio)} · REM: ${pct(sleepData.rem_ratio)}
- SpO2 mínima: ${sleepData.min_spo2 ?? "—"}% · Promedio: ${sleepData.avg_spo2 ?? "—"}%
- Body Battery al despertar: ${sleepData.body_battery_end ?? "—"} pts
- Estrés nocturno: ${sleepData.avg_sleep_stress ?? "—"}
- Limitante principal: ${primaryLimiter ?? "—"}
- Scores Apex: Físico ${sleepData.physical_recovery_score ?? "—"} · Neural ${sleepData.neural_recovery_score ?? "—"} · Recarga ${sleepData.recharge_efficiency != null ? `${Math.round(sleepData.recharge_efficiency)}%` : "—"}

Genera exactamente este JSON, sin texto antes ni después:
{
  "headline": "título impactante de máximo 10 palabras",
  "status": "Listo|Listo con cautela|Precaución|Recuperación limitada",
  "resumen": "2 oraciones: qué pasó esta noche y qué significa para hoy",
  "accion": "1 oración: qué hacer hoy específicamente",
  "alerta": "1 oración si hay algo urgente, null si no hay nada urgente"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();

    return Response.json(JSON.parse(clean));
  } catch {
    return Response.json({
      headline: "Análisis no disponible",
      status: "Listo con cautela",
      resumen:
        "No se pudo generar el análisis. Los datos del sync están disponibles abajo.",
      accion: "Revisa el análisis completo para más detalles.",
      alerta: null,
    });
  }
}
