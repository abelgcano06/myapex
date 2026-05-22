import fs from "fs";
import path from "path";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const USERS_DIR = path.join(GARMIN_DIR, "data", "users");

export function getUserDataDir(emailKey: string): string {
  return path.join(USERS_DIR, emailKey).replace(/\\/g, "/");
}

// Legacy constant — used only when emailKey is not available (single-user fallback)
export const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(USERS_DIR, "abelgcanofuentes_at_hotmail_com");

export function readJson<T>(filePath: string): T | null {
  try {
    // Normalize the path for cross-platform compatibility
    const normalized = filePath.replace(/\\/g, "/");
    if (!fs.existsSync(normalized)) return null;
    const content = fs.readFileSync(normalized, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function readDataJson<T>(relativePath: string, userDir?: string): T | null {
  const baseDir = userDir ?? DATA_DIR;
  const fullPath = path.join(baseDir, relativePath).replace(/\\/g, "/");
  return readJson<T>(fullPath);
}

// Shortcut for performance_intelligence/ files
export function readPIJson<T>(filename: string, userDir?: string): T | null {
  return readDataJson<T>(`performance_intelligence/${filename}`, userDir);
}

// activity_index.json wraps the array in { activities: [...] }
export function readActivityIndex(userDir?: string): Record<string, unknown>[] {
  const raw = readDataJson<{ activities: Record<string, unknown>[] }>("activity_index.json", userDir);
  return raw?.activities ?? [];
}

export function writeDataJson(relativePath: string, data: unknown, userDir?: string): void {
  const baseDir = userDir ?? DATA_DIR;
  const fullPath = path.join(baseDir, relativePath).replace(/\\/g, "/");
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf-8");
}

export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// Resolve a brief_file path that might be relative or absolute
export function resolveBriefFile(briefFile: string): string {
  if (path.isAbsolute(briefFile)) return briefFile.replace(/\\/g, "/");
  return path.join(GARMIN_DIR, briefFile).replace(/\\/g, "/");
}
