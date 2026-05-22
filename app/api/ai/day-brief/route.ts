/**
 * GET /api/ai/day-brief?date=2026-04-19
 *
 * Devuelve el day_brief_ai.json si ya existe (caché).
 * Si no existe, lanza generate_day_brief.py y espera el resultado.
 */
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const PYTHON     = process.env.PYTHON_BIN ?? "c:/garmin-ai/.venv/Scripts/python.exe";
const SCRIPT     = path.join(GARMIN_DIR, "generate_day_brief.py");
const DATA_DIR   = path.join(GARMIN_DIR, "data", "users");

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || getToday();

  const userId = request.cookies.get("apex_garmin_key")?.value ?? "";
  if (!userId) return NextResponse.json({ ok: false, error: "No active session" }, { status: 401 });

  const briefPath = path.join(DATA_DIR, userId, "day", date, "day_brief_ai.json");

  if (fs.existsSync(briefPath)) {
    const brief = JSON.parse(fs.readFileSync(briefPath, "utf-8"));
    return NextResponse.json({ ok: true, cached: true, brief });
  }

  try {
    const { stdout } = await execFileAsync(
      PYTHON,
      [SCRIPT, "--date", date],
      { cwd: GARMIN_DIR, timeout: 90_000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
    );

    const lines  = stdout.trim().split("\n");
    const result = JSON.parse(lines[lines.length - 1]);

    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, cached: false, brief: result.brief });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai/day-brief] Error:", msg);
    return NextResponse.json({ ok: false, error: "No se pudo generar el análisis del día." }, { status: 500 });
  }
}
