import { NextResponse } from "next/server";

const GARMIN_SERVER = "http://127.0.0.1:7845";

export async function GET() {
  try {
    const res = await fetch(`${GARMIN_SERVER}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, error: "Garmin server no disponible — inicia garmin_server.py" });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const res = await fetch(`${GARMIN_SERVER}/workout/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
