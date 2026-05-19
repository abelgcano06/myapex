import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

type Section = "sleep" | "day" | "activity";

function buildSystem(section: Section, ctx: Record<string, unknown>): string {
  let data = "";

  if (section === "sleep") {
    const a  = (ctx.analysis as Record<string, unknown>) ?? {};
    const ai = (ctx.brief_ai as Record<string, unknown>) ?? {};
    const hero = ai.hero as Record<string, unknown> | undefined;
    const today = ai.today as Record<string, unknown> | undefined;
    data = `SUEÑO ${ctx.date ?? ""}
Score recuperación: ${a.overall_recovery_score ?? "—"}
HRV nocturno: ${a.avg_overnight_hrv ?? "—"} ms
Sueño profundo: ${a.deep_ratio != null ? ((Number(a.deep_ratio)) * 100).toFixed(0) : "—"}%
REM: ${a.rem_ratio != null ? ((Number(a.rem_ratio)) * 100).toFixed(0) : "—"}%
Body Battery ganancia: +${a.body_battery_change ?? "—"}
SpO2 mínima: ${a.min_spo2 ?? "—"}%
Eficiencia sueño: ${a.sleep_efficiency != null ? ((Number(a.sleep_efficiency)) * 100).toFixed(0) : "—"}%
${hero ? `Diagnóstico: ${hero.status} — ${hero.headline}` : ""}
${today ? `Recomendación actual: ${today.action}` : ""}`;
  } else if (section === "day") {
    const a   = (ctx.analysis as Record<string, unknown>) ?? {};
    const rs  = (a.recovery_summary  as Record<string, unknown>) ?? {};
    const ed  = (a.energy_dynamics   as Record<string, unknown>) ?? {};
    const nsl = (a.nervous_system_load as Record<string, unknown>) ?? {};
    const pl  = (a.physical_load     as Record<string, unknown>) ?? {};
    const ai  = (ctx.brief_ai as Record<string, unknown>) ?? {};
    const hero  = ai.hero  as Record<string, unknown> | undefined;
    const today = ai.today as Record<string, unknown> | undefined;
    data = `DÍA ${ctx.date ?? ""}
Score del día: ${rs.overall_day_state_score ?? "—"}
Body Battery: ${ed.body_battery_start ?? "—"} → ${ed.body_battery_end ?? "—"} (${Number(ed.body_battery_change ?? 0) >= 0 ? "+" : ""}${Math.round(Number(ed.body_battery_change ?? 0))} pts)
Estrés promedio: ${Math.round(Number(nsl.avg_stress ?? 0))}
FC promedio: ${Math.round(Number(nsl.avg_hr ?? 0))} bpm
Pasos: ${Number(pl.steps ?? 0).toLocaleString()}
Minutos intensidad: ${Math.round(Number(pl.intensity_minutes ?? 0))}
Limitante: ${rs.primary_limiter ?? "—"}
${hero ? `Diagnóstico: ${hero.status} — ${hero.headline}` : ""}
${today ? `Recomendación: ${today.action}` : ""}`;
  } else {
    const a  = (ctx.analysis as Record<string, unknown>) ?? {};
    const gs = (a.garmin_summary  as Record<string, unknown>) ?? {};
    const ds = (a.derived_summary as Record<string, unknown>) ?? {};
    const brief = (ctx.brief as Record<string, unknown>) ?? {};
    const qb    = (brief.quick_brief as Record<string, unknown>) ?? {};
    data = `ACTIVIDAD ${String(gs.start_date ?? "").slice(0, 10)}
Nombre: ${gs.name ?? "—"}
Distancia: ${gs.distance_km ?? "—"} km | Desnivel: ${gs.elevation_m ?? "—"} m | Tiempo: ${gs.moving_minutes ?? "—"} min
NP: ${gs.garmin_np ?? ds.estimated_np ?? "—"}W | TSS: ${gs.garmin_tss ?? ds.estimated_tss ?? "—"}
FC media: ${gs.avg_hr ?? "—"} bpm
${qb.headline ? `Veredicto: ${qb.headline}` : ""}
${qb.score ? `Score: ${qb.score}/100 — ${qb.score_label}` : ""}
${qb.veredicto ?? ""}`;
  }

  return `Eres ApexAI, el coach de rendimiento personal de este atleta. Siempre en español. Directo, conciso, accionable — máximo 3 oraciones por respuesta. Sin presentaciones, sin "según tus datos", sin bullets. Si no tienes el dato, dilo en una oración.

${data}`;
}

export async function POST(request: Request) {
  const body = await request.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    section:  Section;
    context:  Record<string, unknown>;
  };

  const { messages, section, context } = body;
  if (!messages?.length || !section) {
    return NextResponse.json({ ok: false, error: "messages and section required" }, { status: 400 });
  }

  try {
    const resp = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:     buildSystem(section, context ?? {}),
      messages,
    });
    const text = resp.content[0].type === "text" ? resp.content[0].text : "";
    return NextResponse.json({ ok: true, text });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
