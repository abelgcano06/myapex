import { NextResponse } from "next/server";
import { gsFetch } from "@/lib/garmin-server";

export async function GET() {
  const res = await gsFetch("/api/master");
  return NextResponse.json(await res.json());
}
