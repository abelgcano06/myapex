import { NextResponse } from "next/server";
import { gsFetch } from "@/lib/garmin-server";

const EMPTY: Record<string, unknown> = {
  master: null,
  today_readiness: null,
  history_7: [],
  sleep_score: null,
  day_score: null,
  activity: null,
};

export async function GET() {
  try {
    const res = await gsFetch("/api/home");
    if (!res.ok) return NextResponse.json(EMPTY);
    const text = await res.text();
    if (!text || !text.trim()) return NextResponse.json(EMPTY);
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(EMPTY);
  }
}
