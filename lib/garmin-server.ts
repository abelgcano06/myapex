import { cookies } from "next/headers";

export const GS = process.env.GARMIN_SERVER_URL ?? "http://127.0.0.1:7845";

export async function gsFetch(path: string, init?: RequestInit): Promise<Response> {
  const extraHeaders: Record<string, string> = {};
  try {
    const cookieStore = await cookies();
    const userKey = cookieStore.get("apex_garmin_key")?.value ?? "";
    const userEmail = cookieStore.get("apex_garmin_email")?.value ?? "";
    if (userKey) extraHeaders["X-Apex-User"] = userKey;
    if (userEmail) extraHeaders["X-Apex-Email"] = userEmail;
  } catch { /* outside request context — skip */ }

  return fetch(`${GS}${path}`, {
    cache: "no-store",
    ...init,
    headers: { ...(init?.headers as Record<string, string> ?? {}), ...extraHeaders },
  });
}
