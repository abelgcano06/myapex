/**
 * GET /api/activity/brief?id=22530043901
 *
 * Devuelve el activity_brief.json si ya existe (caché).
 * Si no existe, lanza generate_activity_brief.py y espera el resultado.
 * Segunda llamada es instantánea — el brief queda guardado en disco.
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
const SCRIPT     = path.join(GARMIN_DIR, "generate_activity_brief.py");
const DATA_DIR   = path.join(GARMIN_DIR, "data", "users");

function getBriefPath(userId: string, activityId: string): string {
  return path.join(DATA_DIR, userId, "activities", activityId, "activity_brief.json");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const userId = request.cookies.get("apex_garmin_key")?.value ?? "";
  if (!userId) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }

  const briefPath = getBriefPath(userId, id);

  // ── Caché: ya existe ──────────────────────────────────────────────────────
  if (fs.existsSync(briefPath)) {
    const brief = JSON.parse(fs.readFileSync(briefPath, "utf-8"));
    return NextResponse.json({ ok: true, cached: true, brief });
  }

  // ── Generar on-demand ─────────────────────────────────────────────────────
  try {
    const { stdout } = await execFileAsync(
      PYTHON,
      [SCRIPT, "--activity_id", id],
      {
        cwd: GARMIN_DIR,
        timeout: 60_000,          // 60 s máximo — una sola llamada a Claude
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      }
    );

    // stdout puede tener líneas de log antes del JSON final
    const lines  = stdout.trim().split("\n");
    const result = JSON.parse(lines[lines.length - 1]);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cached: false, brief: result.brief });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[activity/brief] Error:", msg);
    return NextResponse.json(
      { ok: false, error: "No se pudo generar el brief de actividad." },
      { status: 500 }
    );
  }
}
