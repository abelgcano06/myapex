import { NextResponse } from "next/server";
import { gsFetch } from "@/lib/garmin-server";

export async function GET() {
  const res = await gsFetch("/api/profile-full");
  return NextResponse.json(await res.json());
}

export async function POST(request: Request) {
  const body = await request.json();
  const res  = await gsFetch("/api/profile", {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return NextResponse.json(await res.json());
}
