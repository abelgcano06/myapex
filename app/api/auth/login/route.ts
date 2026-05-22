import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const ACCOUNTS_FILE = path.join(GARMIN_DIR, "data", "accounts.json");

interface Account {
  user_id: string; email: string; name: string;
  password_hash: string; password_salt: string;
  garmin_email?: string; garmin_password?: string;
  onboarding_completed: boolean; created_at: string;
}

interface AccountsStore { users: Account[]; }

function readAccounts(): AccountsStore {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8")) as AccountsStore;
    }
  } catch { /* ignore */ }
  return { users: [] };
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function makeUserId(email: string): string {
  return email.replace(/@/g, "_at_").replace(/\./g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; password?: string };
  const { email, password } = body;

  if (!email?.trim() || !password) {
    return NextResponse.json({ ok: false, error: "Email y contraseña son requeridos." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const store = readAccounts();
  const account = store.users.find(u => u.email === normalizedEmail);

  if (account) {
    // New account system — validate password hash
    const hash = hashPassword(password, account.password_salt);
    if (hash !== account.password_hash) {
      return NextResponse.json({ ok: false, error: "Email o contraseña incorrectos." }, { status: 401 });
    }

    // Restore Garmin session.json so sync works
    if (account.garmin_email && account.garmin_password) {
      const sessionDir = path.join(GARMIN_DIR, "data");
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionDir, "session.json"),
        JSON.stringify({ email: account.garmin_email, password: account.garmin_password }, null, 2),
        "utf-8"
      );
    }

    return NextResponse.json({
      ok: true,
      user_id: account.user_id,
      email: account.email,
      name: account.name,
      onboarding_completed: account.onboarding_completed,
    });
  }

  // Legacy fallback: treat email/password as Garmin credentials (for existing users)
  const sessionDir = path.join(GARMIN_DIR, "data");
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionDir, "session.json"),
    JSON.stringify({ email: normalizedEmail, password }, null, 2),
    "utf-8"
  );

  return NextResponse.json({
    ok: true,
    user_id: makeUserId(normalizedEmail),
    email: normalizedEmail,
    name: "",
    onboarding_completed: true,
  });
}
