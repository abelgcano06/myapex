import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email y contraseña son requeridos." },
      { status: 400 }
    );
  }

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  if (!trimmedEmail || !trimmedPassword) {
    return NextResponse.json(
      { ok: false, error: "Email y contraseña no pueden estar vacíos." },
      { status: 400 }
    );
  }

  // Save credentials to session.json
  const sessionDir = path.join(process.env.GARMIN_DIR ?? "c:/garmin-ai", "data");
  const sessionPath = path.join(sessionDir, "session.json");

  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    fs.writeFileSync(
      sessionPath,
      JSON.stringify({ email: trimmedEmail, password: trimmedPassword }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Failed to write session.json:", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar la sesión." },
      { status: 500 }
    );
  }

  const userId = trimmedEmail.replace("@", "_at_").replace(/\./g, "_");

  return NextResponse.json({ ok: true, user_id: userId });
}
