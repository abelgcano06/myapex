import { NextResponse } from "next/server";
import { gsFetch } from "@/lib/garmin-server";

export async function GET() {
  const res  = await gsFetch("/api/activities");
  const data = await res.json();
  const activities: Record<string, unknown>[] = data.activities ?? data;
  const sorted = [...activities].sort(
    (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
  );
  return NextResponse.json(sorted.slice(0, 100));
}
