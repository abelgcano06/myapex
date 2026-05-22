import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const ACCOUNTS_FILE = path.join(GARMIN_DIR, "data", "accounts.json");

interface AccountsStore {
  users: Array<{
    email: string; onboarding_completed: boolean;
    [key: string]: unknown;
  }>;
}

export async function POST(request: Request) {
  const body = await request.json() as { email?: string };
  if (!body.email) {
    return NextResponse.json({ ok: false, error: "Email requerido." }, { status: 400 });
  }

  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
      return NextResponse.json({ ok: true });
    }
    const store = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8")) as AccountsStore;
    const user = store.users.find(u => u.email === body.email);
    if (user) {
      user.onboarding_completed = true;
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(store, null, 2), "utf-8");
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
