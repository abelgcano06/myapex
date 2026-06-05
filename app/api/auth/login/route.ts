import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { dbFindByEmail } from "@/lib/accounts-db";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function makeUserId(email: string): string {
  return email.replace(/@/g, "_at_").replace(/\./g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

function makeGarminKey(garminEmail: string): string {
  return garminEmail.replace(/@/g, "_at_").replace(/\./g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

function setCookies(response: NextResponse, garminEmail: string) {
  const garminKey = makeGarminKey(garminEmail);
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };
  response.cookies.set("apex_garmin_key", garminKey, opts);
  response.cookies.set("apex_garmin_email", garminEmail, opts);
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
  const body = await request.json() as { email?: string; password?: string };
  const { email, password } = body;

  if (!email?.trim() || !password) {
    return NextResponse.json({ ok: false, error: "Email y contraseña son requeridos." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const account = await dbFindByEmail(normalizedEmail);

  if (!account) {
    return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const hash = crypto.pbkdf2Sync(password, account.password_salt, 100000, 64, "sha512").toString("hex");
  if (hash !== account.password_hash) {
    return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user_id: account.user_id,
    email: account.email,
    name: account.name,
    onboarding_completed: account.onboarding_completed,
  });

  if (account.garmin_email && account.garmin_password) {
    writeUserSession(account.garmin_email, account.garmin_password);
    setCookies(response, account.garmin_email);
  }

  return response;
}
