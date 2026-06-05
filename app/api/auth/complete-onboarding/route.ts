import { NextResponse } from "next/server";
import { dbCompleteOnboarding } from "@/lib/accounts-db";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string };
  if (!body.email) {
    return NextResponse.json({ ok: false, error: "Email requerido." }, { status: 400 });
  }
  await dbCompleteOnboarding(body.email);
  return NextResponse.json({ ok: true });
}
