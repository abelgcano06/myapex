import fs from "fs";
import path from "path";

export const DATA_DIR =
  process.env.DATA_DIR ||
  "c:/garmin-ai/data/users/abelgcanofuentes_at_hotmail_com";

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

export function readDataJson<T>(relativePath: string): T | null {
  const fullPath = path.join(DATA_DIR, relativePath).replace(/\\/g, "/");
  return readJson<T>(fullPath);
}

// Shortcut for performance_intelligence/ files
export function readPIJson<T>(filename: string): T | null {
  return readDataJson<T>(`performance_intelligence/${filename}`);
}

// activity_index.json wraps the array in { activities: [...] }
export function readActivityIndex(): Record<string, unknown>[] {
  const raw = readDataJson<{ activities: Record<string, unknown>[] }>("activity_index.json");
  return raw?.activities ?? [];
}

export function writeDataJson(relativePath: string, data: unknown): void {
  const fullPath = path.join(DATA_DIR, relativePath).replace(/\\/g, "/");
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
  // It's relative to the repo root (c:/garmin-ai)
  return path.join("c:/garmin-ai", briefFile).replace(/\\/g, "/");
}
