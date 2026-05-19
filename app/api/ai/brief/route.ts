import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  readDataJson,
  readJson,
  readPIJson,
  readActivityIndex,
  resolveBriefFile,
  writeDataJson,
  getToday,
} from "@/lib/data";

interface BriefRequest {
  section: "sleep" | "day" | "activity" | "master";
  date?: string;
  id?: string;
  type: "quick" | "deep";
}

const DEEP_PROMPT_TEMPLATE = `[ATHLETE_CONTEXT]

Eres un especialista en fisiología del rendimiento deportivo para ciclistas MTB.
Analiza estos datos y genera un análisis profundo en español en formato JSON con estos campos:
{
  "headline": "título impactante de 1 línea",
  "tipo_de_dia": "descripción del tipo",
  "insight_principal": "el hallazgo más importante",
  "que_esta_pasando": "explicación fisiológica 2-3 párrafos",
  "que_significa_para_ti": "implicación personal — usa las referencias personales del atleta si están disponibles",
  "impacto_rendimiento": "qué esperar en el rendimiento",
  "recomendacion": "qué hacer concreto y accionable — calibrado a su nivel y fase de temporada",
  "key_takeaways": ["punto 1", "punto 2", "punto 3"]
}

Datos del [SECTION]:
[DATA_JSON]`;

async function callClaudeDeep(
  section: string,
  data: Record<string, unknown>,
  athleteContext: string = ""
): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const athleteBlock = athleteContext
    ? `=========================================================\nATLETA — QUIÉN ES ESTA PERSONA\n=========================================================\n${athleteContext}\n\nINSTRUCCIÓN CRÍTICA: Interpreta los valores de HOY contra las referencias personales\ndel atleta. Calibra recomendaciones a su nivel real, fase de temporada y objetivo.\n=========================================================`
    : "";

  const prompt = DEEP_PROMPT_TEMPLATE
    .replace("[ATHLETE_CONTEXT]", athleteBlock)
    .replace("[SECTION]", section)
    .replace("[DATA_JSON]", JSON.stringify(data, null, 2));

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Try to extract JSON from the response
  const raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return raw;
}

export async function POST(request: Request) {
  const body: BriefRequest = await request.json();
  const { section, date, id, type } = body;

  const targetDate = date || getToday();

  // ── QUICK ──────────────────────────────────────────────────────────────────
  if (type === "quick") {
    if (section === "sleep") {
      const briefAi = readDataJson<Record<string, unknown>>(
        `sleep/${targetDate}/sleep_brief_ai.json`
      );
      if (briefAi) return NextResponse.json(briefAi);
      return NextResponse.json({
        pending: true,
        message: "Ejecuta el sync primero para generar el análisis rápido.",
      });
    }

    if (section === "day") {
      const briefAi = readDataJson<Record<string, unknown>>(
        `day/${targetDate}/day_brief_ai.json`
      );
      if (briefAi) return NextResponse.json(briefAi);
      return NextResponse.json({
        pending: true,
        message: "Ejecuta el sync primero para generar el análisis rápido.",
      });
    }

    if (section === "activity") {
      if (!id)
        return NextResponse.json({ error: "id required" }, { status: 400 });
      const activityIndex = readActivityIndex();
      const activity = activityIndex.find(
        (a) => String(a.activity_id) === String(id)
      );
      if (!activity) return NextResponse.json({ pending: true });
      const briefFilePath = resolveBriefFile(activity.brief_file as string);
      const brief = readJson<Record<string, unknown>>(briefFilePath);
      if (brief) return NextResponse.json(brief);
      return NextResponse.json({ pending: true });
    }

    if (section === "master") {
      const master = readPIJson<Record<string, unknown>>("master_brief.json");
      if (master) return NextResponse.json(master);
      return NextResponse.json({ pending: true });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  // ── DEEP ───────────────────────────────────────────────────────────────────
  if (type === "deep") {
    // Return cached deep result if it already exists
    const deepCachePath =
      section === "sleep" ? `sleep/${targetDate}/sleep_deep_ai.json`
      : section === "day" ? `day/${targetDate}/day_deep_ai.json`
      : null;

    if (deepCachePath) {
      const cached = readDataJson<Record<string, unknown>>(deepCachePath);
      if (cached) return NextResponse.json({ content: cached, cached: true });
    }

    try {
      let dataForAnalysis: Record<string, unknown> = {};

      if (section === "sleep") {
        const analysis = readDataJson<Record<string, unknown>>(
          `sleep/${targetDate}/sleep_analysis.json`
        );
        const findings = readDataJson<Record<string, unknown>>(
          `sleep/${targetDate}/sleep_findings.json`
        );
        const brief = readDataJson<Record<string, unknown>>(
          `sleep/${targetDate}/sleep_brief.json`
        );
        dataForAnalysis = {
          analysis: analysis ?? {},
          findings: findings ?? {},
          brief: brief ?? {},
        };
      } else if (section === "day") {
        const analysis = readDataJson<Record<string, unknown>>(
          `day/${targetDate}/day_analysis.json`
        );
        const findings = readDataJson<Record<string, unknown>>(
          `day/${targetDate}/day_findings.json`
        );
        dataForAnalysis = {
          analysis: analysis ?? {},
          findings: findings ?? {},
        };
      } else if (section === "activity") {
        if (!id)
          return NextResponse.json({ error: "id required" }, { status: 400 });
        const activityIndex = readActivityIndex();
        const activity = activityIndex.find(
          (a) => String(a.activity_id) === String(id)
        );
        dataForAnalysis = { activity: activity ?? {} };
      } else if (section === "master") {
        const master = readPIJson<Record<string, unknown>>("master_brief.json");
        dataForAnalysis = { master: master ?? {} };
      }

      // Load athlete baseline context for personalized recommendations
      const baseline = readPIJson<{ athlete_context_string?: string; physiological_baselines?: unknown; health_flags?: unknown }>("athlete_baseline.json");
      const athleteContext = baseline?.athlete_context_string ?? "";

      const rawJson = await callClaudeDeep(section, dataForAnalysis, athleteContext);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        parsed = { raw: rawJson };
      }
      // Save to disk so we never call Claude again for the same day
      if (deepCachePath) {
        try { writeDataJson(deepCachePath, parsed); } catch { /* non-fatal */ }
      }
      return NextResponse.json({ content: parsed });
    } catch (err) {
      console.error("Claude deep analysis error:", err);
      return NextResponse.json(
        { error: "Error al generar análisis profundo." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
