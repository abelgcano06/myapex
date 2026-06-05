import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { dbUpdateGarminCredentials } from "@/lib/accounts-db";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const PYTHON = process.env.PYTHON_BIN ?? "c:/garmin-ai/.venv/Scripts/python.exe";

function validateWithPython(garminEmail: string, garminPassword: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = path.join(GARMIN_DIR, "validate_garmin.py");
    if (!fs.existsSync(script)) { resolve(true); return; }
    const proc = spawn(PYTHON, [script, "--email", garminEmail, "--password", garminPassword], {
      cwd: GARMIN_DIR,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    let output = "";
    proc.stdout?.on("data", (d: Buffer) => { output += d.toString(); });
    proc.on("close", (code) => { resolve(code === 0 && output.includes("ok")); });
    setTimeout(() => { proc.kill(); resolve(false); }, 30000);
  });
}

function makeGarminKey(garminEmail: string): string {
  return garminEmail.replace(/@/g, "_at_").replace(/\./g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

function writeUserSession(garminEmail: string, garminPassword: string) {
  const garminKey = makeGarminKey(garminEmail);
  const sessionsDir = path.join(GARMIN_DIR, "data", "sessions");
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, `${garminKey}.json`),
    JSON.stringify({ email: garminEmail, password: garminPassword }, null, 2),
    "utf-8"
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { garmin_email?: string; garmin_password?: string; apex_email?: string };
  const { garmin_email, garmin_password, apex_email } = body;

  if (!garmin_email?.trim() || !garmin_password) {
    return NextResponse.json({ ok: false, error: "Ingresa tu email y contraseña de Garmin." }, { status: 400 });
  }

  const normalizedGarminEmail = garmin_email.trim().toLowerCase();

  writeUserSession(normalizedGarminEmail, garmin_password);

  const valid = await validateWithPython(normalizedGarminEmail, garmin_password);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "No se pudo conectar con Garmin. Verifica tu email y contraseña." }, { status: 401 });
  }

  if (apex_email) {
    await dbUpdateGarminCredentials(apex_email, normalizedGarminEmail, garmin_password);
  }

  const garminKey = makeGarminKey(normalizedGarminEmail);
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };
  const response = NextResponse.json({ ok: true });
  response.cookies.set("apex_garmin_key", garminKey, cookieOpts);
  response.cookies.set("apex_garmin_email", normalizedGarminEmail, cookieOpts);
  return response;
}
