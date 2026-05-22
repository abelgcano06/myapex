import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const ACCOUNTS_FILE = path.join(GARMIN_DIR, "data", "accounts.json");

interface Account {
  user_id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  garmin_email?: string;
  garmin_password?: string;
  onboarding_completed: boolean;
  created_at: string;
}

interface AccountsStore {
  users: Account[];
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
  const dir = path.dirname(ACCOUNTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function makeUserId(email: string): string {
  return email.replace(/@/g, "_at_").replace(/\./g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; email?: string; password?: string };
  const { name, email, password } = body;

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ ok: false, error: "Faltan campos requeridos." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const store = readAccounts();
  const existing = store.users.find(u => u.email === normalizedEmail);
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  const salt = crypto.randomBytes(32).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const userId = makeUserId(normalizedEmail);

  const account: Account = {
    user_id: userId,
    email: normalizedEmail,
    name: name.trim(),
    password_hash: passwordHash,
    password_salt: salt,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  };

  store.users.push(account);
  writeAccounts(store);

  return NextResponse.json({
    ok: true,
    user_id: userId,
    email: normalizedEmail,
    name: name.trim(),
  });
}
