import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const PYTHON = process.env.PYTHON_BIN ?? "c:/garmin-ai/.venv/Scripts/python.exe";
const ACCOUNTS_FILE = path.join(GARMIN_DIR, "data", "accounts.json");

interface AccountsStore {
  users: Array<{
    user_id: string; email: string; name: string;
    password_hash: string; password_salt: string;
    garmin_email?: string; garmin_password?: string;
    onboarding_completed: boolean; created_at: string;
  }>;
}

function readAccounts(): AccountsStore {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8")) as AccountsStore;
    }
  } catch { /* ignore */ }
  return { users: [] };
}

function writeAccounts(store: AccountsStore) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function validateWithPython(garminEmail: string, garminPassword: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = path.join(GARMIN_DIR, "validate_garmin.py");

    // If no validation script, try connecting via a quick test
    if (!fs.existsSync(script)) {
      // Save credentials and assume valid — sync will fail if wrong
      resolve(true);
      return;
    }

    const proc = spawn(PYTHON, [script, "--email", garminEmail, "--password", garminPassword], {
      cwd: GARMIN_DIR,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let output = "";
    proc.stdout?.on("data", (d: Buffer) => { output += d.toString(); });
    proc.on("close", (code) => {
      resolve(code === 0 && output.includes("ok"));
    });

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

  // Write per-user session file (used by sync script)
  writeUserSession(normalizedGarminEmail, garmin_password);

  // Validate with Python if script exists
  const valid = await validateWithPython(normalizedGarminEmail, garmin_password);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "No se pudo conectar con Garmin. Verifica tu email y contraseña." }, { status: 401 });
  }

  // Update accounts.json with Garmin credentials
  if (apex_email) {
    const store = readAccounts();
    const user = store.users.find(u => u.email === apex_email);
    if (user) {
      user.garmin_email = normalizedGarminEmail;
      user.garmin_password = garmin_password;
      writeAccounts(store);
    }
  }

  const garminKey = makeGarminKey(normalizedGarminEmail);
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };
  const response = NextResponse.json({ ok: true });
  response.cookies.set("apex_garmin_key", garminKey, cookieOpts);
  response.cookies.set("apex_garmin_email", normalizedGarminEmail, cookieOpts);
  return response;
}
