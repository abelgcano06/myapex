import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const GARMIN_DIR = process.env.GARMIN_DIR ?? "c:/garmin-ai";
const DATA_DIR = process.env.GARMIN_DATA_DIR ?? path.join(GARMIN_DIR, "data");
const SYNC_SCRIPT = path.join(GARMIN_DIR, "run_sync.py");

function getSyncPaths(request: NextRequest) {
  const garminKey = request.cookies.get("apex_garmin_key")?.value ?? "";
  const sessionsDir = path.join(DATA_DIR, "sessions");
  if (garminKey) {
    return {
      garminKey,
      sessionFile: path.join(sessionsDir, `${garminKey}.json`),
      statusFile: path.join(sessionsDir, `${garminKey}_status.json`),
      logFile: path.join(sessionsDir, `${garminKey}_sync.log`),
    };
  }
  // Legacy fallback
  return {
    garminKey: "",
    sessionFile: path.join(DATA_DIR, "session.json"),
    statusFile: path.join(DATA_DIR, "sync_status.json"),
    logFile: path.join(DATA_DIR, "sync_log.txt"),
  };
}

interface SyncStatus {
  status: "idle" | "starting" | "running" | "done" | "error";
  step?: string;
  new_activities?: number;
  days_back?: number;
  started_at?: string;
  finished_at?: string;
  message?: string;
}

const STALE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

function readStatus(statusFile: string): SyncStatus {
  if (!fs.existsSync(statusFile)) return { status: "idle" };
  try {
    const s = JSON.parse(fs.readFileSync(statusFile, "utf-8")) as SyncStatus;
    if ((s.status === "running" || s.status === "starting") && s.started_at) {
      const age = Date.now() - new Date(s.started_at).getTime();
      if (age > STALE_TIMEOUT_MS) {
        const reset: SyncStatus = { status: "idle" };
        fs.writeFileSync(statusFile, JSON.stringify(reset), "utf-8");
        return reset;
      }
    }
    return s;
  } catch {
    return { status: "idle" };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { logFile, statusFile } = getSyncPaths(request);

  if (searchParams.get("log") === "1") {
    const log = fs.existsSync(logFile)
      ? fs.readFileSync(logFile, "utf-8")
      : "(sin log)";
    return new Response(log, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  return NextResponse.json(readStatus(statusFile));
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sections = searchParams.get("sections") ?? "sleep,day,activities,master,ftp,profile";
  const { sessionFile, statusFile, logFile } = getSyncPaths(request);

  const current = readStatus(statusFile);
  if (current.status === "running" || current.status === "starting") {
    return NextResponse.json(
      { ok: false, error: "Sync already running", step: current.step },
      { status: 409 }
    );
  }

  // Ensure directories exist
  fs.mkdirSync(path.dirname(statusFile), { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(logFile, `=== SYNC ${new Date().toISOString()} ===\n`, "utf-8");
  fs.writeFileSync(
    statusFile,
    JSON.stringify({ status: "starting", started_at: new Date().toISOString() }),
    "utf-8"
  );

  const PYTHON = process.env.PYTHON_BIN ?? "c:/garmin-ai/.venv/Scripts/python.exe";
  const args = [
    SYNC_SCRIPT,
    "--log-file", logFile,
    "--sections", sections,
    "--session-file", sessionFile,
    "--status-file", statusFile,
  ];

  const proc = spawn(PYTHON, args, {
    cwd: GARMIN_DIR,
    detached: true,
    shell: false,
    stdio: "ignore",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });

  proc.on("error", (err) => {
    fs.appendFileSync(logFile, `\n[spawn error] ${err.message}\n`);
    fs.writeFileSync(
      statusFile,
      JSON.stringify({ status: "error", message: `No se pudo iniciar Python: ${err.message}` }),
      "utf-8"
    );
  });

  proc.unref();

  return NextResponse.json({ ok: true, message: "Sync started" });
}
