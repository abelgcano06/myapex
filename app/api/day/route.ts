import { NextResponse } from "next/server";
import { gsFetch } from "@/lib/garmin-server";

const EMPTY = { date: "", analysis: null, brief_ai: null, deep_ai: null };

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  const path = date ? `/api/day?date_param=${date}` : "/api/day";
  try {
    const res = await gsFetch(path);
    if (!res.ok) return NextResponse.json(EMPTY);
    const text = await res.text();
    if (!text) return NextResponse.json(EMPTY);
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(EMPTY);
  }
}
