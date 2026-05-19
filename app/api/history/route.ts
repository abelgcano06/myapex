import { NextResponse } from "next/server";
import { gsFetch } from "@/lib/garmin-server";

export async function GET(request: Request) {
  const params  = new URL(request.url).searchParams;
  const section = params.get("section");
  const days    = params.get("days") ?? "7";
  if (!section) return NextResponse.json({ error: "section required" }, { status: 400 });
  const res = await gsFetch(`/api/history?section=${section}&days=${days}`);
  return NextResponse.json(await res.json());
}
