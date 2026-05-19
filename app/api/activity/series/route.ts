import { NextResponse } from "next/server";
import { gsFetch } from "@/lib/garmin-server";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const res = await gsFetch(`/api/activity/${id}/series`);
  return NextResponse.json(await res.json());
}
