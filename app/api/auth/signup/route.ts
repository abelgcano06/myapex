import { NextResponse } from "next/server";
import crypto from "crypto";
import { dbFindByEmail, dbCreateAccount } from "@/lib/accounts-db";

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

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await dbFindByEmail(normalizedEmail);
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  const salt = crypto.randomBytes(32).toString("hex");
  const userId = makeUserId(normalizedEmail);

  await dbCreateAccount({
    user_id: userId,
    email: normalizedEmail,
    name: name.trim(),
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, user_id: userId, email: normalizedEmail, name: name.trim() });
}
