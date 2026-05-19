export const GS = process.env.GARMIN_SERVER_URL ?? "http://127.0.0.1:7845";

export async function gsFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GS}${path}`, { cache: "no-store", ...init });
}
